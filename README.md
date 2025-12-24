# Easy Contract 📝

**The AI that simplifies bureaucracy.**

Easy Contract is a modern web application that allows users to upload legal contracts (PDF) and receive a simplified legal analysis using Artificial Intelligence. It provides a safety score, highlights potential risks, and offers actionable advice in seconds.

## 🌟 Features

-   **⚡ Rapid Analysis**: Get immediate insights into your contracts.
-   **🛡️ Secure Privacy**: Files are processed on the fly and not stored.
-   **⚖️ Smart Advice**: Receive clear, actionable recommendations (e.g., "Sign it," "Renegotiate").
-   **🔍 Risk Detection**: Automatically identifies hidden costs, binding clauses, and penalties.

## 🛠️ Tech Stack

-   **Frontend**: [Streamlit](https://streamlit.io/)
-   **AI Engine**: [Google Gemini](https://ai.google.dev/) (`gemini-2.5-flash`)
-   **Language**: Python 3.x

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   Python 3.8+
-   A Google Cloud API Key for Gemini (Get it [here](https://aistudio.google.com/))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/falker47/easy-contract.git
    cd easy-contract
    ```

2.  **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure API Keys**
    Create a `.streamlit/secrets.toml` file in the root directory:
    ```bash
    mkdir .streamlit
    # On Windows: type nul > .streamlit/secrets.toml (or create manually)
    ```
    Add your API key(s) to `.streamlit/secrets.toml`:
    ```toml
    # Single key
    GEMINI_API_KEY = "your-api-key-here"

    # Or multiple keys for rotation (optional)
    GEMINI_API_KEYS = ["key1", "key2"]
    ```

4.  **Run the application**
    ```bash
    streamlit run app.py
    ```

## 📖 Usage

1.  Open the app in your browser (usually `http://localhost:8501`).
2.  Upload a PDF contract via the file uploader.
3.  Click **"Analizza Contratto"** (Analyze Contract).
4.  View the AI-generated report containing:
    -   **Score**: Safety rating (1-10).
    -   **Summary**: Brief explanation of the contract.
    -   **Attention Points**: Critical issues to watch out for.
    -   **Advice**: Final recommendation.

## ☁️ Deployment

This app is ready for **Streamlit Cloud**.
1.  Push your code to GitHub.
2.  Connect your repository to Streamlit Cloud.
3.  Add your secrets (`GEMINI_API_KEY`) in the Streamlit Cloud dashboard settings.

## 👤 Author

**Maurizio Falconi (falker47)**
-   [Portfolio](https://falker47.github.io/Nexus-portfolio/)
-   [GitHub](https://github.com/falker47)
