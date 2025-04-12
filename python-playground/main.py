from google import genai

# Initialize the Gemini client with your API key
client = genai.Client(api_key="AIzaSyAJ2Ov158oM6VDQrww0dTgO1JruwjFGWaY")

# List models that support specific actions
print("List of models that support generateContent:")
for model in client.models.list():
    if "generateContent" in model.supported_actions:
        print(model.name)

print("List of models that support embedContent:")
for model in client.models.list():
    if "embedContent" in model.supported_actions:
        print(model.name)
