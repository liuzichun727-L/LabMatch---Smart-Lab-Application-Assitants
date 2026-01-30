
# LabMatch AI - Smart Researcher Assistant

A high-performance research matching platform powered by Google Gemini API.

## Enhanced Features
1. **PDF Text Extraction**: Students can now upload their CV as a PDF or text file for instant AI analysis.
2. **Dynamic Progress Tracking**: A visual top-bar indicates exactly which stage of the application process the user is in.
3. **Student-Centric Email Engine**: Generates 2-paragraph application emails using a "Direct Student" tone—concise, confident, and professional.
4. **Massive Search Capability**: Scans for 30+ faculty members per search using Google Search grounding.
5. **Tiered Laboratory Matching**: Automatically categorizes matches into High Alignment, Strong Relevance, and Potential tiers.

## Technical Details
- **Frontend**: React 19, Tailwind CSS.
- **AI**: Gemini 3 Flash (Analysis & Search), Gemini 3 Pro (Drafting).
- **Processing**: `PDF.js` for client-side document reading.
- **Tone**: Optimized prompts to produce respectful yet modern academic communication.

## Quick Start
1. Provide a Google AI Studio API Key in your environment.
2. Upload your CV (PDF/TXT).
3. Search for your target institution.
4. Review tiered matches and generate your personalized application drafts.
