import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { question, language, languageName, includeImage, imageData, context } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured',
        answer: 'Sorry, the AI service is not available right now. Please contact your teacher for help.'
      }, { status: 500 })
    }

    // Construct the prompt based on context and language
    let systemPrompt = `You are an expert educational AI assistant helping students with their doubts and questions during a live whiteboard lesson. 

Your role:
- Provide clear, educational explanations suitable for students
- Be encouraging and supportive
- Focus on helping students understand concepts
- Provide step-by-step solutions when appropriate
- Use simple language that students can understand
- Be patient and thorough in explanations

Response language: ${languageName} (${language})
Context: The student is asking about content from an educational whiteboard session.

Important guidelines:
- Always respond in ${languageName} language
- Keep explanations clear and educational
- Encourage learning and curiosity
- If you cannot see an image clearly, ask for clarification
- Provide examples when helpful
- Be supportive and positive in tone`

    if (includeImage && imageData) {
      systemPrompt += `\n\nThe student has included a screenshot of the current whiteboard. Please analyze the image and provide relevant explanations based on what you can see in the whiteboard content.`
    }

    // Prepare the request to Gemini API
    const geminiPayload: any = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nStudent's question: ${question}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    }

    // Add image data if provided
    if (includeImage && imageData) {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
      
      geminiPayload.contents[0].parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      })
    }

    // Make request to Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload)
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API error:', errorData)
      
      // Provide fallback response
      return NextResponse.json({
        answer: `I'm sorry, I'm having trouble processing your question right now. Here are some general tips that might help:

1. Break down complex problems into smaller steps
2. Look for patterns in the examples shown
3. Review the key concepts discussed in class
4. Don't hesitate to ask your teacher for clarification

Please try asking your question again, or contact your teacher directly for immediate help.`
      })
    }

    const data = await geminiResponse.json()
    
    // Extract the response text
    let answer = 'Sorry, I could not generate a response. Please try again.'
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        answer = candidate.content.parts[0].text || answer
      }
    }

    // Log the interaction for analytics (without sensitive data)
    console.log('AI Doubt Solver interaction:', {
      language,
      hasImage: includeImage,
      questionLength: question.length,
      responseLength: answer.length,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      answer,
      language,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in doubt solver API:', error)
    
    return NextResponse.json({
      answer: `I apologize, but I'm experiencing technical difficulties. Here are some ways you can get help:

1. Try asking your question again in a few moments
2. Raise your hand to ask the teacher directly
3. Use the chat to ask classmates or the teacher
4. Take a screenshot of your doubt and discuss it after class

Don't worry - learning involves asking questions, and your curiosity is appreciated!`
    }, { status: 500 })
  }
}