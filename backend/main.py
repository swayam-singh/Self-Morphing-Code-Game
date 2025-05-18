from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from game_logic import GameEngine

app = FastAPI()
engine = GameEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/levels")
def get_levels():
    return engine.get_level_list()

@app.post("/start")
async def start_level(request: Request):
    data = await request.json()
    level_index = data.get("level", 0)
    return engine.start_level(level_index)

@app.post("/action")
async def take_action(request: Request):
    data = await request.json()
    return engine.process_action(data)
