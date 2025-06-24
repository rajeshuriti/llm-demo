// Vercel serverless function for diagram generation
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { description, diagramType } = req.body;
    if (!description || typeof description !== 'string' || description.length < 10) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: 'Description is required and must be at least 10 characters.'
      });
      return;
    }

    // TODO: Integrate your Gemini/diagram generation logic here
    // For now, return a mock response
    res.status(200).json({
      success: true,
      data: {
        mermaidCode: 'graph TD\n    A[Start] --> B[End]',
        diagramType: diagramType || 'auto',
        generationTime: '100ms',
        warnings: []
      },
      metadata: {
        inputLength: description.length,
        outputLength: 30,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
