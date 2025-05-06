# Smart Call Summary - Evaluation Criteria & Actionable Generation Logic

## Overview

This document explains the criteria and algorithmic logic used in the Smart Call Summary application to evaluate sales call transcripts and generate actionable insights. The system uses a combination of speaker diarization, conversation analysis, and GPT-based natural language processing to produce comprehensive call summaries.

## Transcription & Data Processing

### Speaker Diarization
- **Algorithm**: AssemblyAI's speaker labeling technology
- **Criteria**: Distinguishes between different speakers based on voice characteristics
- **Processing**: Automatically maps AssemblyAI speaker labels (A, B, C) to role-based labels (Agent, Customer)

## Evaluation Framework

### 1. Key Discussion Points Analysis

The system identifies and extracts key topics and discussion points using the following criteria:

- **Significance**: Topics that occupy substantial portions of the conversation
- **Recurrence**: Themes that appear multiple times throughout the call
- **Emphasis**: Points emphasized by either speaker through repetition or explicit highlighting
- **Decision Impact**: Topics that influence decision-making or next steps

### 2. Objection Detection & Classification

Objections are detected and categorized based on:

- **Customer Resistance Signals**: Phrases indicating hesitation or disagreement
- **Concern Categories**: Automatic classification into standard categories:
  - **Budget**: Price or cost-related concerns
  - **Authority**: Decision-making ability issues
  - **Need**: Questions about necessity or value
  - **Timeline**: Concerns about implementation time
  - **Competitor**: Mentions of alternative solutions
  - **Technical**: Questions about features, capabilities, or limitations

### 3. Agent Performance Evaluation

Agent performance is assessed across multiple dimensions:

- **Overall Rating**: Holistic evaluation on a scale of 1-10
- **Tone Analysis**: Assessment of agent's communication style (empathetic, professional, etc.)
- **Objection Handling**: Effectiveness in addressing customer concerns
- **Communication**: Clarity, articulation, and explanation quality
- **Strengths**: Identification of particularly effective techniques used
- **Areas for Improvement**: Opportunities for enhancing future performance

## Actionable Insight Generation Logic

### 1. Customer Intent Summary

The intent summary is generated through:

- **Intent Classification**: Identifying the primary motivation behind the customer's engagement
- **Content Analysis**: Examining key statements and questions from the customer
- **Contextual Understanding**: Considering the progression of conversation and customer responses
- **Sentiment Analysis**: Evaluating emotional tone to gauge level of interest

### 2. Follow-Up Task Recommendations

Follow-up tasks are generated based on:

- **Unresolved Questions**: Outstanding queries that weren't fully addressed
- **Explicit Requests**: Direct asks from the customer during the call
- **Next Steps Agreement**: Mutually acknowledged future actions
- **Opportunity Signals**: Potential areas of interest identified from customer engagement
- **Standard Protocol**: Industry best practices for the identified conversation type

## Technical Implementation

The evaluation and actionable generation process is implemented through:

1. **Preprocessing**: Structuring transcribed text with speaker identification
2. **Semantic Analysis**: Utilizing GPT-4.1 to analyze conversation context, flow and meaning
