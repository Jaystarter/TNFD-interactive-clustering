// netlify/functions/api.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const serverless = require('serverless-http'); // Import serverless-http

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins - adjust as needed for production
// Increase JSON body limit to handle large tools arrays sent from the frontend
app.use(express.json({ limit: '2mb' }));

// Middleware for request logging and prefix stripping removed for production

// Check for API Key on server startup (within the function environment)
if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined in environment variables.");
  // In a serverless context, throwing might stop initialization.
  // It's better to log and let requests fail gracefully.
} else {
  console.log("GEMINI_API_KEY loaded successfully.");
}

// Lazily initialize Gemini AI only if the key exists
let genAI, model;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the latest stable model recommended by Google
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); 
    console.log("Gemini AI Model initialized.");
  } else {
      console.error("Gemini AI Model NOT initialized due to missing API key.");
  }
} catch (initError) {
    console.error("Error initializing GoogleGenerativeAI:", initError);
    genAI = null;
    model = null;
}

// Add a simple root route for testing reachability
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Netlify function api endpoint reached successfully.' });
});

// Route for natural language search
// Path is relative to the '/api/' prefix handled by Netlify redirects
app.post('/natural-language-search', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Request body:`, req.body);
  // Check if model initialized correctly
  if (!model) {
    console.error("Search attempt failed: Gemini model not available.");
    return res.status(500).json({ error: 'AI service initialization failed. Check API key.' });
  }
  
  try {
    const { query, tools } = req.body;

    if (!query || !tools || !Array.isArray(tools)) {
      return res.status(400).json({ error: 'Invalid request. Query and tools array required.' });
    }

    // Prepare the prompt with tool information
    const toolData = tools.map(tool => ({
      name: tool.name,
      category: tool.category,
      primaryFunction: tool.primaryFunction || '',
      dataSources: tool.dataSources || '',
      targetUser: tool.targetUser || '',
      environmentType: tool.environmentType || ''
    }));

    // Format the tool data for the prompt
    const toolsString = JSON.stringify(toolData, null, 2);

    // Craft the prompt for Gemini
    const prompt = `You are a helpful assistant for the TNFD (Taskforce on Nature-related Financial Disclosures) Tools Navigator.

Given the user query: "${query}"

Find the most relevant tools from this list that match what the user is looking for:

${toolsString}

Return ONLY the names of the top 5 most relevant tools that match the query as a JSON array, like this:
["Tool Name 1", "Tool Name 2", "Tool Name 3", "Tool Name 4", "Tool Name 5"]

If fewer than 5 tools are relevant, return only those that are relevant. Ensure the output is a valid JSON array of strings.`;

    console.log(`[${new Date().toISOString()}] Processing /natural-language-search for query:`, query ? query.substring(0, 50) + '...' : 'undefined');

    // Generate content with Gemini
    console.log(`[${new Date().toISOString()}] Calling Gemini API...`);
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Gemini API call finished. Duration: ${endTime - startTime}ms`);
    const response = await result.response;
    const responseText = await response.text();
    console.log(`[${new Date().toISOString()}] Received Gemini response text (first 100 chars):`, responseText.substring(0, 100));

    // Parse the response text to extract the JSON array
    let relevantToolNames = [];
    try {
      // Stronger regex to find the JSON array, handling potential leading/trailing text/markdown
      const jsonMatch = responseText.match(/```json\n?(\s*(\[.*?\])\s*)\n?```|(\s*(\[.*?\])\s*)/s);
      
      let jsonString;
      if (jsonMatch) {
          // Prioritize the explicit JSON block match first, then the standalone array match
          jsonString = jsonMatch[2] || jsonMatch[4]; 
      }

      if (jsonString) {
          console.log(`[${new Date().toISOString()}] Parsing JSON string from regex match...`);
          relevantToolNames = JSON.parse(jsonString);
          console.log(`[${new Date().toISOString()}] Parsed relevant tool names:`, relevantToolNames);
      } else {
           // Fallback: attempt to parse the whole text if no clear JSON found
           console.log(`[${new Date().toISOString()}] No JSON block/array found via regex, attempting direct parse...`);
           try {
             relevantToolNames = JSON.parse(responseText);
             console.log(`[${new Date().toISOString()}] Direct parse successful:`, relevantToolNames);
           } catch (parseError) {
             console.error(`[${new Date().toISOString()}] Error parsing Gemini response (direct attempt):`, parseError);
             console.error(`[${new Date().toISOString()}] Original Gemini Response Text:`, responseText);
             console.log(`[${new Date().toISOString()}] Sending 500 response due to direct parse error.`);
             return res.status(500).json({ error: 'Failed to parse AI response', details: parseError.message, rawResponse: responseText });
           }
      }

      if (!Array.isArray(relevantToolNames)) {
        console.error(`[${new Date().toISOString()}] Parsed response is not an array. Value:`, relevantToolNames);
        throw new Error('Parsed response is not an array');
      }
      // Ensure elements are strings
      relevantToolNames = relevantToolNames.map(name => String(name));

    } catch (parseError) {
      console.error(`[${new Date().toISOString()}] Error parsing Gemini response (outer catch):`, parseError);
      console.error(`[${new Date().toISOString()}] Original Gemini Response Text:`, responseText);
      console.log(`[${new Date().toISOString()}] Sending 500 response due to outer parse error.`);
      return res.status(500).json({ error: 'Failed to parse AI response', details: parseError.message, rawResponse: responseText });
    }

    // Filter the original tools data based on the extracted names
    const relevantToolsData = tools.filter(tool =>
      relevantToolNames.some(name =>
        tool.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(tool.name.toLowerCase())
      )
    );
    console.log(`[${new Date().toISOString()}] Found ${relevantToolsData.length} matching tools from names.`);

    console.log(`[${new Date().toISOString()}] Sending 200 response with relevant tools.`);
    res.json({ relevantTools: relevantToolsData });

  } catch (error) {
    // Log the specific error encountered during the request processing
    console.error(`[${new Date().toISOString()}] !!! Error processing /natural-language-search request (main catch):`, error);
    // Ensure a valid JSON response is sent even on error
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.log(`[${new Date().toISOString()}] Sending 500 response due to main catch block.`);
    res.status(500).json({
      error: 'Failed to process natural language search.',
      details: errorMessage
    });
  }
});

// Configure serverless-http to strip the Netlify function base path so Express routes match correctly.
module.exports.handler = serverless(app, {
  basePath: '/.netlify/functions/api'
});
