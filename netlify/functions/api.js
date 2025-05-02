// netlify/functions/api.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const serverless = require('serverless-http'); // Import serverless-http

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins - adjust as needed for production
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`--> Request Log: ${req.method} ${req.path} (Original URL: ${req.originalUrl})`);
  // Log headers if needed for deeper debugging:
  // console.log('--> Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Strip /api prefix introduced by Netlify redirects so route definitions match
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    const originalUrl = req.url;
    req.url = req.url.replace(/^\/api/, '');
    console.log(`--> Stripped prefix: ${originalUrl} -> ${req.url}`);
  }
  next();
});

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
  console.log("GET /api/ received");
  res.status(200).json({ message: 'Netlify function api endpoint reached successfully.' });
});

// Route for natural language search
// Path is relative to the '/api/' prefix handled by Netlify redirects
app.post('/natural-language-search', async (req, res) => {
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

    // Generate content with Gemini
    console.log("Sending prompt to Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = await response.text();
    console.log("Received response from Gemini.");

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
          console.log("Parsing JSON string:", jsonString);
          relevantToolNames = JSON.parse(jsonString);
      } else {
           // Fallback: attempt to parse the whole text if no clear JSON found
           console.log("No clear JSON block found, attempting to parse entire response.");
           relevantToolNames = JSON.parse(responseText);
      }

      if (!Array.isArray(relevantToolNames)) {
        throw new Error('Parsed response is not an array');
      }
      // Ensure elements are strings
      relevantToolNames = relevantToolNames.map(name => String(name));
      console.log("Successfully parsed tool names:", relevantToolNames);

    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      console.log("Raw response text:", responseText);
      // Attempt fallback parsing if JSON fails
      relevantToolNames = responseText
        .replace(/[\[\]"\'\`]/g, '') // Remove brackets, quotes
        .split(',') // Split by comma
        .map(item => item.trim())
        .filter(item => item && item.length > 0 && !item.toLowerCase().includes('tool name')); // Basic filtering
       console.log("Fallback parsed tool names:", relevantToolNames);
    }

    // Filter the original tools data based on the extracted names
    const relevantToolsData = tools.filter(tool =>
      relevantToolNames.some(name =>
        tool.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(tool.name.toLowerCase())
      )
    );
    console.log(`Found ${relevantToolsData.length} matching tools.`);

    res.json({ relevantTools: relevantToolsData });

  } catch (error) {
    // Log the specific error encountered during the request processing
    console.error('!!! Error processing /natural-language-search request:', error);
    // Ensure a valid JSON response is sent even on error
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to process natural language search.', 
      details: errorMessage 
      // Avoid sending the full error object directly in the response 
      // as it might contain sensitive info or not be serializable.
    });
  }
});

// Export the serverless handler
module.exports.handler = serverless(app);
