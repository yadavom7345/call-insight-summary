import { useState, useCallback, useEffect, useRef } from 'react'
import OpenAI from 'openai'
import './App.css'

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState(null)
  const [error, setError] = useState(null)
  const [openAiApiKey, setOpenAiApiKey] = useState('')
  const [assemblyAiApiKey, setAssemblyAiApiKey] = useState('')
  const [showFullConversation, setShowFullConversation] = useState(false)
  const [insights, setInsights] = useState(null)
  const [actionables, setActionables] = useState(null)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)

  useEffect(() => {
    const oaiKey = import.meta.env.VITE_OPENAI_API_KEY
    const aaiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY
    
    console.log('API Keys status:', {
      OpenAI: oaiKey ? 'Present' : 'Missing',
      AssemblyAI: aaiKey ? 'Present' : 'Missing'
    })
    
    if (!oaiKey) {
      setError('OpenAI API key is not set. Please add it to your .env file.')
    } else {
      setOpenAiApiKey(oaiKey)
    }
    
    if (!aaiKey) {
      setError('AssemblyAI API key is not set. Please add it to your .env file.')
    } else {
      setAssemblyAiApiKey(aaiKey)
    }
  }, [])

  useEffect(() => {
    if (transcription && transcription.length > 0) {
      generateInsights(transcription)
    }
  }, [transcription])

  const openai = new OpenAI({
    apiKey: openAiApiKey,
    dangerouslyAllowBrowser: true
  })

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Upload audio file to AssemblyAI temporary storage
  const uploadAudioFile = async (audioFile) => {
    setIsUploading(true)
    try {
      const response = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': assemblyAiApiKey
        },
        body: audioFile
      })

      if (!response.ok) {
        throw new Error(`AssemblyAI upload failed with status: ${response.status}`)
      }

      const data = await response.json()
      return data.upload_url
    } catch (error) {
      console.error('Error uploading to AssemblyAI:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  // Check transcription status
  const checkTranscriptionStatus = async (transcriptId) => {
    try {
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        method: 'GET',
        headers: {
          'Authorization': assemblyAiApiKey
        }
      })

      if (!response.ok) {
        throw new Error(`AssemblyAI status check failed with status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error checking transcription status:', error)
      throw error
    }
  }

  // Initiate transcription with speaker diarization
  const initiateTranscription = async (audioUrl) => {
    try {
      const response = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': assemblyAiApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speaker_labels: true, // Enable speaker diarization
          speakers_expected: 2  // We expect 2 speakers (agent and customer)
        })
      })

      if (!response.ok) {
        throw new Error(`AssemblyAI transcription initiation failed with status: ${response.status}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      console.error('Error initiating transcription:', error)
      throw error
    }
  }

  // Process AssemblyAI utterances into our format
  const processUtterances = (utterances) => {
    return utterances.map(utterance => ({
      // Map AssemblyAI speaker labels (A, B, C...) to our labels (Agent, Customer)
      speaker: utterance.speaker === 'A' ? 'Agent' : 'Customer',
      text: utterance.text,
      start: utterance.start / 1000, // Convert from milliseconds to seconds
      end: utterance.end / 1000     // Convert from milliseconds to seconds
    }));
  }

  const generateInsights = async (transcript) => {
    setIsGeneratingInsights(true);
    
    try {
      // Combine all transcript segments into a single text for OpenAI
      const transcriptText = transcript.map(segment => 
        `${segment.speaker}: ${segment.text}`
      ).join('\n\n');
      
      // Create OpenAI chat completion request with a detailed prompt for structured output
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "You are an expert sales call analyzer specialized in extracting insights from conversation transcripts."
          },
          {
            role: "user",
            content: `Analyze this sales call transcript and provide insights on key discussion points, objections, agent performance, and next steps. Include a concise intent summary explaining the customer's primary intent and level of interest.

Transcript:
${transcriptText}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_call",
              description: "Analyze a sales call transcript and extract insights",
              parameters: {
                type: "object",
                properties: {
                  keyDiscussionPoints: {
                    type: "array",
                    description: "Main topics and important points discussed in the call",
                    items: {
                      type: "string"
                    }
                  },
                  objections: {
                    type: "object",
                    description: "Customer objections categorized by type",
                    additionalProperties: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    }
                  },
                  agentPerformance: {
                    type: "object",
                    description: "Evaluation of the sales agent's performance",
                    properties: {
                      "Overall Rating": {
                        type: "string",
                        description: "Overall score out of 10"
                      },
                      "Tone": {
                        type: "string",
                        description: "Assessment of agent's tone"
                      },
                      "Objection Handling": {
                        type: "string",
                        description: "Assessment of how well objections were handled"
                      },
                      "Communication": {
                        type: "string",
                        description: "Assessment of communication clarity"
                      },
                      "Strengths": {
                        type: "string",
                        description: "Key strengths of the agent"
                      },
                      "Areas for Improvement": {
                        type: "string",
                        description: "Suggested improvements"
                      }
                    }
                  },
                  nextActionables: {
                    type: "object",
                    description: "Follow-up tasks and customer interest level",
                    properties: {
                      tasks: {
                        type: "array",
                        description: "List of recommended follow-up tasks",
                        items: {
                          type: "string"
                        }
                      },
                      intentSummary: {
                        type: "string",
                        description: "A concise summary of the customer's intent and interest level"
                      }
                    }
                  }
                },
                required: ["keyDiscussionPoints", "objections", "agentPerformance", "nextActionables"]
              }
            }
          }
        ],
        tool_choice: {
          type: "function",
          function: {
            name: "analyze_call"
          }
        }
      });
      
      // Extract the JSON response from the function call
      const toolCall = response.choices[0].message.tool_calls?.[0];
      if (!toolCall) {
        throw new Error("No tool call found in the response");
      }
      
      // Parse the JSON response
      const analysisData = JSON.parse(toolCall.function.arguments);
      console.log("OpenAI Analysis:", analysisData);
      
      // Set the insights and actionables state with the OpenAI response
      setInsights({
        keyPoints: analysisData.keyDiscussionPoints || [],
        objectionsByType: analysisData.objections || {},
        labeledTranscript: transcript,
        performance: analysisData.agentPerformance || {}
      });
      
      setActionables({
        followUps: analysisData.nextActionables?.tasks || [],
        intentSummary: analysisData.nextActionables?.intentSummary || ""
      });
      
    } catch (err) {
      console.error('Error generating insights with OpenAI:', err);
      setError('Error generating insights: ' + err.message);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const transcribeAudio = async (audioFile) => {
    if (!assemblyAiApiKey) {
      setError('AssemblyAI API key is not set. Please add it to your .env file.')
      return
    }

    try {
      setIsTranscribing(true)
      setError(null)
      console.log('Starting transcription for file:', audioFile.name)

      // Step 1: Upload the file to AssemblyAI
      console.log('Uploading audio file to AssemblyAI...')
      const uploadUrl = await uploadAudioFile(audioFile)
      console.log('File uploaded. URL:', uploadUrl)

      // Step 2: Start the transcription with speaker diarization
      console.log('Initiating transcription with speaker diarization...')
      const transcriptId = await initiateTranscription(uploadUrl)
      console.log('Transcription initiated. ID:', transcriptId)

      // Step 3: Poll for results
      console.log('Polling for transcription results...')
      let result = await checkTranscriptionStatus(transcriptId)
      
      while (result.status !== 'completed' && result.status !== 'error') {
        // Wait for 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Update progress if available
        if (result.status === 'processing' && result.percent && result.percent > 0) {
          setTranscriptionProgress(result.percent)
        }
        
        result = await checkTranscriptionStatus(transcriptId)
      }

      if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`)
      }

      console.log('Transcription completed:', result)

      // Step 4: Process the results
      if (result.utterances && result.utterances.length > 0) {
        const processedTranscription = processUtterances(result.utterances)
        console.log('Processed transcription:', processedTranscription)
        setTranscription(processedTranscription)
        setShowFullConversation(false) // Reset to show only first two statements
      } else {
        throw new Error('No utterances found in the transcription result')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setError('Error transcribing audio: ' + (err.message || 'Unknown error occurred'))
    } finally {
      setIsTranscribing(false)
      setTranscriptionProgress(0)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      console.log('File dropped:', droppedFile.name, droppedFile.type)
      if (!droppedFile.type.startsWith('audio/')) {
        setError('Please upload an audio file')
        return
      }
      // Reset states when new file is uploaded
      setInsights(null)
      setActionables(null)
      setTranscription(null)
      setShowFullConversation(false)
      setFile(droppedFile)
      transcribeAudio(droppedFile)
    }
  }, [assemblyAiApiKey])

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      console.log('File selected:', selectedFile.name, selectedFile.type)
      if (!selectedFile.type.startsWith('audio/')) {
        setError('Please upload an audio file')
        return
      }
      // Reset states when new file is uploaded
      setInsights(null)
      setActionables(null)
      setTranscription(null)
      setShowFullConversation(false)
      setFile(selectedFile)
      transcribeAudio(selectedFile)
    }
  }, [assemblyAiApiKey])

  const getDisplayedTranscription = () => {
    if (!transcription) return []
    if (showFullConversation) return transcription

    // Get first statement from each speaker
    const firstAgent = transcription.find(segment => segment.speaker === 'Agent')
    const firstCustomer = transcription.find(segment => segment.speaker === 'Customer')
    
    return [firstAgent, firstCustomer].filter(Boolean)
  }

  // Render a section of the report
  const renderReportSection = (title, content) => (
    <div className="report-section">
      <h3>{title}</h3>
      {content}
    </div>
  )

  // Get transcription status message
  const getTranscriptionStatusMessage = () => {
    if (isUploading) return 'Uploading audio file...'
    if (transcriptionProgress > 0) return `Transcribing audio... ${transcriptionProgress}%`
    return 'Transcribing audio...'
  }

  return (
    <div className="app-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input
          type="file"
          id="fileInput"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="audio/*"
        />
        <div className="drop-zone-content">
          {isTranscribing ? (
            <p>{getTranscriptionStatusMessage()}</p>
          ) : file ? (
            <p>Selected file: {file.name}</p>
          ) : (
            <p>Drag and drop your call recording here</p>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {transcription && (
        <div className="transcription-container" key={file ? file.name : 'transcription'}>
          <h2>Transcription</h2>
          <div className="transcription-content">
            {getDisplayedTranscription().map((segment, index) => (
              <div key={index} className="transcription-segment">
                <div className="speaker-label">{segment.speaker}</div>
                <div className="speaker-text">{segment.text}</div>
                <div className="timestamp">
                  {new Date(segment.start * 1000).toISOString().substr(11, 8)} - 
                  {new Date(segment.end * 1000).toISOString().substr(11, 8)}
                </div>
              </div>
            ))}
            {transcription.length > 2 && (
              <button 
                className="show-more-button"
                onClick={() => setShowFullConversation(!showFullConversation)}
              >
                {showFullConversation ? 'Show Less' : 'Show Full Conversation'}
              </button>
            )}
          </div>
        </div>
      )}

      {isGeneratingInsights && (
        <div className="insights-loading">
          <p>Generating insights...</p>
        </div>
      )}

      {insights && actionables && (
        <div className="report-container" key={file ? file.name + '-report' : 'report'}>
          <h2>Call Summary Report</h2>
          
          {renderReportSection("Key Points", 
            <ul className="key-points-list">
              {insights.keyPoints && insights.keyPoints.map((point, index) => (
                <li key={index}>
                  {point.topic ? (
                    <>
                      <span className="key-point-topic">{point.topic}:</span> {point.point}
                    </>
                  ) : (
                    <>{point}</>
                  )}
                </li>
              ))}
            </ul>
          )}
          
          {insights.objectionsByType && Object.keys(insights.objectionsByType).length > 0 && renderReportSection("2. Objections", 
            <div className="objections-container">
              {Object.entries(insights.objectionsByType).map(([type, items], index) => (
                <div key={index} className="objection-group">
                  <h4>{type}</h4>
                  <ul>
                    {Array.isArray(items) ? (
                      items.map((item, i) => (
                        <li key={i}>
                          {typeof item === 'string' ? item : (
                            <>"{item.text}" <span className="timestamp-text">
                              ({item.timestamp ? new Date(item.timestamp * 1000).toISOString().substr(11, 8) : 'n/a'})
                            </span></>
                          )}
                        </li>
                      ))
                    ) : (
                      <li>{items}</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
          
          {renderReportSection("Agent Performance", 
            <div className="performance-metrics">
              <div className="metrics-grid">
                {insights.performance && Object.entries(insights.performance).map(([key, value], index) => (
                  <div key={index} className="metric-item">
                    <div className="metric-label">{key}</div>
                    <div className="metric-value">
                      {typeof value === 'object' ? JSON.stringify(value) : value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {renderReportSection("Next Steps", 
            <div className="next-steps">
              <div className="intent-summary-container">
                <div className="intent-summary-label">Customer Intent Summary</div>
                <div className="intent-summary-text">
                  {actionables.intentSummary}
                </div>
              </div>
              
              <div className="follow-ups">
                <h4>Recommended Follow-ups</h4>
                <ul className="follow-ups-list">
                  {actionables.followUps && actionables.followUps.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
