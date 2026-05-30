import uvicorn

def main():
    print("Starting Classical RAG API Server...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
