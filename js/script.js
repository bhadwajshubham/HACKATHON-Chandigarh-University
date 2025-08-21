document.addEventListener('DOMContentLoaded', () => {
    // --- All variables and API settings ---
    // User's provided settings. No changes made.
    const GEMINI_API_KEY = 'AIzaSyAQ4QCNBYUzibLV0aij1I7kkaKhHLTNFM4';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

    // Element selectors
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const analyzeBtn = document.getElementById('analyze-btn');
    const summaryArea = document.getElementById('summary-area');
    const followUpButtonsArea = document.getElementById('follow-up-buttons');
    const detailsArea = document.getElementById('details-area');
    
    let uploadedImageBase64 = null;
    let initialDiagnosis = {}; // To store the summary

    // --- API Call Function (No changes needed in the function itself) ---
    async function callGeminiAPI(prompt, imageBase64 = null) {
        let payload = imageBase64 ? 
            { contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] }] } :
            { contents: [{ parts: [{ text: prompt }] }] };
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorBody = await response.json(); console.error("API Error:", errorBody);
                return `Error: ${errorBody.error.message}`;
            }
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                return "Sorry, the AI response was not in the expected format.";
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            return "An error occurred while contacting the AI service.";
        }
    }

    // --- File Upload Logic ---
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadArea.innerHTML = `<img src="${e.target.result}" alt="Uploaded Crop Image" style="max-width: 100%; max-height: 250px; border-radius: 8px;">`;
                uploadedImageBase64 = e.target.result.split(',')[1];
                analyzeBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });
    // Make upload area clickable
    document.getElementById('upload-btn').addEventListener('click', () => fileInput.click());
    document.getElementById('camera-btn').addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', () => fileInput.click());


    // --- Main Analysis Logic ---
    analyzeBtn.addEventListener('click', async () => {
        if (!uploadedImageBase64) return;
        
        // Reset UI
        analyzeBtn.disabled = true;
        analyzeBtn.innerText = 'Analyzing...';
        summaryArea.innerHTML = `<p>Getting summary...</p>`;
        followUpButtonsArea.innerHTML = '';
        detailsArea.innerHTML = '';
        followUpButtonsArea.classList.add('hidden');

        const language = document.getElementById('language').value;
        
        // 1. Get the short summary
        const initialPrompt = `Analyze the provided image of a plant. Provide a very short summary in JSON format. The JSON should have three keys: "disease", "severity" (Low, Medium, or High), and "cause". Respond ONLY with the JSON object. Language for the values: ${language}.`;
        
        const summaryResponse = await callGeminiAPI(initialPrompt, uploadedImageBase64);
        
        try {
            // Clean the response to make sure it's valid JSON
            const cleanedResponse = summaryResponse.replace(/```json|```/g, '').trim();
            initialDiagnosis = JSON.parse(cleanedResponse);

            // Display the summary
            summaryArea.innerHTML = `
                <div class="summary">
                    <p><strong>Disease:</strong> ${initialDiagnosis.disease}</p>
                    <p><strong>Severity:</strong> ${initialDiagnosis.severity}</p>
                    <p><strong>Cause:</strong> ${initialDiagnosis.cause}</p>
                </div>
            `;

            // 2. Create and show follow-up buttons
            createFollowUpButtons(language);
            followUpButtonsArea.classList.remove('hidden');

        } catch (e) {
            console.error("Failed to parse summary JSON:", e);
            summaryArea.innerHTML = `<p style="color: red;">Sorry, could not get a valid summary from the AI. Please try again.</p><p>Details: ${summaryResponse}</p>`;
        }
        
        analyzeBtn.disabled = false;
        analyzeBtn.innerText = 'Analyze with AI';
    });

    // --- Follow-up Logic ---
    function createFollowUpButtons(language) {
        const buttons = [
            { text: "Detailed Description", action: "description" },
            { text: "Treatment Plan", action: "treatment" },
            { text: "Prevention Tips", action: "prevention" }
        ];

        buttons.forEach(buttonInfo => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.innerText = buttonInfo.text;
            button.addEventListener('click', async () => {
                // Show loading in details area
                detailsArea.innerHTML = `<p>🧠 Getting details...</p>`;

                let followUpPrompt = '';
                if (buttonInfo.action === "description") {
                    followUpPrompt = `Give me a detailed description for the disease "${initialDiagnosis.disease}". Language: ${language}.`;
                } else if (buttonInfo.action === "treatment") {
                    followUpPrompt = `Create a detailed HTML-formatted action plan (organic and chemical) to treat "${initialDiagnosis.disease}". Include purchase links by creating Amazon search URLs. Language: ${language}.`;
                } else if (buttonInfo.action === "prevention") {
                    followUpPrompt = `Provide a list of practical prevention tips for "${initialDiagnosis.disease}". Language: ${language}.`;
                }

                const detailsResponse = await callGeminiAPI(followUpPrompt);
                detailsArea.innerHTML = detailsResponse;
            });
            followUpButtonsArea.appendChild(button);
        });
    }
});