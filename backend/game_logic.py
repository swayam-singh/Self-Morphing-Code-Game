# game_logic.py
import json
import random
from deap import base, creator, tools, algorithms

class GameEngine:
    def __init__(self):
        with open("levels.json", encoding="utf-8") as f:
            self.levels = json.load(f)

        self.completed_levels = set()
        self.secret_level_unlocked = False
        self.population = self.init_evolutionary_ai()
        self.reset_level(0)

    def reset_level(self, level_index):
        self.current_level = self.levels[level_index]
        self.level_index = level_index
        self.used_tools = []
        self.successful_exploits = []
        self.fake_vulnerabilities = ["Ping Flood", "Email Spoof", "ARP Poison"]
        self.max_attempts = 7
        self.status = "ongoing"
        self.decoy_added = False

    def get_level_list(self):
        level_list = []
        for i, level in enumerate(self.levels):
            is_secret = level.get("secret", False)
            locked = is_secret and not self.secret_level_unlocked
            if not is_secret or self.secret_level_unlocked:
                level_list.append({
                    "index": i,
                    "name": level["name"],
                    "locked": locked,
                    "completed": i in self.completed_levels
                })
        return level_list

    def start_level(self, level_index):
        if level_index >= len(self.levels):
            return {"message": "❌ Invalid level index."}

        is_secret = self.levels[level_index].get("secret", False)
        if is_secret and not self.secret_level_unlocked:
            return {"message": "🔒 Secret level is locked. Complete all missions first."}

        if not is_secret and level_index > 0 and (level_index - 1) not in self.completed_levels:
            return {"message": f"🔒 Level {level_index} is locked. Complete previous mission first."}

        self.reset_level(level_index)
        level = self.current_level

        return {
            "message": f"{level['name']}",
            "briefing": level.get("briefing", "No briefing provided."),
            "objective": level["objective"],
            "tools": level["tools"]
        }

    def process_action(self, action):
        tool = action.get("tool", "").strip()
        response = {
            "tool_used": tool,
            "status": self.status
        }

        if self.status != "ongoing":
            response["result"] = f"⚠️ Game over. Status: {self.status.upper()}"
            response["score"] = 100 - (len(self.used_tools) * 10) if self.status == "win" else 0
            return response

        self.used_tools.append(tool)

        # Patch repeated tools using evolved policy
        if self.used_tools.count(tool) > 1 and tool in self.current_level["vulnerabilities"]:
            self.current_level["vulnerabilities"].remove(tool)
            response["ai_mutation"] = f"'{tool}' has been patched and removed by AI."

        real_vulnerabilities = [v for v in self.current_level["vulnerabilities"] if v not in self.fake_vulnerabilities]

        if tool in real_vulnerabilities:
            if tool not in self.successful_exploits:
                self.successful_exploits.append(tool)
            response["result"] = "✅ Exploit successful"
            response["ai_response"] = f"AI recognized and patched '{tool}'"

            if set(self.successful_exploits) == set(real_vulnerabilities):
                self.status = "win"
                response["result"] = "🎉 You captured the flag! System compromised."
                response["score"] = 100 - (len(self.used_tools) * 10)
                self.completed_levels.add(self.level_index)

                if all(not lvl.get("secret", False) and idx in self.completed_levels for idx, lvl in enumerate(self.levels)):
                    self.secret_level_unlocked = True
                    response["ai_mutation"] = "🧠 Secret mission unlocked."

        elif tool in self.fake_vulnerabilities:
            response["result"] = "⚠️ Honeypot triggered! AI detected deception."
            response["ai_response"] = "AI has hardened defenses."

        else:
            response["result"] = "❌ Access Denied"
            response["ai_response"] = f"No vulnerability found for '{tool}'"

        if len(self.used_tools) >= 3 and not self.decoy_added:
            evolved_decoy = self.evolve_ai_defense()
            self.current_level["vulnerabilities"].append(evolved_decoy)
            self.decoy_added = True
            response["ai_mutation"] = f"🔁 AI deployed evolved honeypot: '{evolved_decoy}'"

        if len(self.used_tools) >= self.max_attempts and self.status != "win":
            self.status = "lose"
            response["result"] = "💀 You’ve been detected. Game Over!"
            response["score"] = 0

        response["status"] = self.status
        return response

    def init_evolutionary_ai(self):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
        creator.create("Individual", list, fitness=creator.FitnessMin)

        toolbox = base.Toolbox()
        all_tools = ["SQL Injection", "XSS", "Brute Force", "ARP Poison", "Ping Flood", "DNS Tunneling", "Social Engineering"]

        toolbox.register("attr_tool", random.choice, all_tools)
        toolbox.register("individual", tools.initRepeat, creator.Individual, toolbox.attr_tool, 1)
        toolbox.register("population", tools.initRepeat, list, toolbox.individual)
        toolbox.register("evaluate", self.fitness_function)
        toolbox.register("mate", tools.cxTwoPoint)
        toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.5)
        toolbox.register("select", tools.selTournament, tournsize=3)

        population = toolbox.population(n=10)
        self.toolbox = toolbox
        return population

    def evolve_ai_defense(self):
        # Run one generation and return best honeypot
        offspring = algorithms.varAnd(self.population, self.toolbox, cxpb=0.5, mutpb=0.3)
        fits = list(map(self.toolbox.evaluate, offspring))
        for ind, fit in zip(offspring, fits):
            ind.fitness.values = fit
        self.population = self.toolbox.select(offspring, k=len(self.population))
        best = tools.selBest(self.population, k=1)[0]
        return best[0]

    def fitness_function(self, individual):
        # Lower fitness if player exploited it often
        tool = individual[0]
        penalty = self.used_tools.count(tool)
        return (penalty,)  # Single-value fitness tuple
