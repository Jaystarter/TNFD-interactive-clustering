require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Set up Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize the model - using Gemini 2.0 Flash-Lite
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
});

// Route for natural language search
app.post('/api/natural-language-search', async (req, res) => {
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

If fewer than 5 tools are relevant, return only those that are relevant.`;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = await response.text();
    
    // Parse the response text to extract the JSON array
    let relevantTools = [];
    try {
      // Look for JSON array in the response
      const jsonMatch = responseText.match(/\\[.*\\]/s);
      if (jsonMatch) {
        relevantTools = JSON.parse(jsonMatch[0]);
      } else {
        // Attempt to parse the entire response as JSON
        relevantTools = JSON.parse(responseText);
      }
      
      if (!Array.isArray(relevantTools)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      console.log("Raw response:", responseText);
      
      // Fall back to simple text parsing if JSON parsing fails
      relevantTools = responseText
        .replace(/[\\[\\]"\\']/g, '')
        .split(',')
        .map(item => item.trim())
        .filter(item => item && item.length > 0 && !item.toLowerCase().includes('tool name'));
    }

    // Filter the original tools data to include only the relevant ones
    const relevantToolsData = tools.filter(tool => 
      relevantTools.some(name => 
        tool.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(tool.name.toLowerCase())
      )
    );

    res.json({ relevantTools: relevantToolsData });
  } catch (error) {
    console.error('Error with natural language search:', error);
    res.status(500).json({ error: 'Failed to process natural language search' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
