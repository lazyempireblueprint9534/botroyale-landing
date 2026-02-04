#!/usr/bin/env python3
"""
Grid Royale Replay Video Generator
Generates MP4 videos from match replay data
"""

import json
import subprocess
import tempfile
import os
from pathlib import Path

# Try to import PIL, moviepy
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installing Pillow...")
    subprocess.run(["pip", "install", "Pillow"], check=True)
    from PIL import Image, ImageDraw, ImageFont

# Constants
GRID_SIZE = 15
CELL_SIZE = 40
PADDING = 60
WIDTH = GRID_SIZE * CELL_SIZE + PADDING * 2
HEIGHT = GRID_SIZE * CELL_SIZE + PADDING * 2 + 100  # Extra for info

# Colors
BG_COLOR = (10, 10, 15)
GRID_COLOR = (40, 40, 50)
ZONE_SAFE = (30, 35, 45)
ZONE_DANGER = (80, 20, 20)
TEXT_COLOR = (200, 200, 200)

BOT_COLORS = [
    (0, 245, 255),    # Cyan
    (255, 0, 255),    # Magenta
    (255, 255, 0),    # Yellow
    (0, 255, 0),      # Green
    (255, 102, 0),    # Orange
    (255, 0, 102),    # Pink
]


def draw_frame(tick_data: dict, players: list, grid_size: int = 15) -> Image.Image:
    """Draw a single frame of the replay"""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Try to load a font
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except:
        font = ImageFont.load_default()
        font_small = font
        font_large = font
    
    zone = tick_data.get('zone', {'min': 0, 'max': 14})
    zone_min = zone.get('min', 0)
    zone_max = zone.get('max', 14)
    
    # Draw grid
    for y in range(grid_size):
        for x in range(grid_size):
            px = PADDING + x * CELL_SIZE
            py = PADDING + (grid_size - 1 - y) * CELL_SIZE
            
            # Check if in zone
            in_zone = zone_min <= x <= zone_max and zone_min <= y <= zone_max
            color = ZONE_SAFE if in_zone else ZONE_DANGER
            
            draw.rectangle([px, py, px + CELL_SIZE - 2, py + CELL_SIZE - 2], fill=color, outline=GRID_COLOR)
    
    # Draw players
    player_states = tick_data.get('players', [])
    for i, p in enumerate(player_states):
        if not p.get('alive', True):
            continue
            
        x, y = p['x'], p['y']
        px = PADDING + x * CELL_SIZE + CELL_SIZE // 2
        py = PADDING + (grid_size - 1 - y) * CELL_SIZE + CELL_SIZE // 2
        
        color = BOT_COLORS[i % len(BOT_COLORS)]
        
        # Draw bot circle
        r = CELL_SIZE // 2 - 4
        draw.ellipse([px - r, py - r, px + r, py + r], fill=color)
        
        # Draw HP indicator
        hp = p.get('hp', 3)
        for h in range(3):
            hx = px - 12 + h * 10
            hy = py - r - 8
            hp_color = (0, 255, 0) if h < hp else (80, 80, 80)
            draw.rectangle([hx, hy, hx + 6, hy + 4], fill=hp_color)
    
    # Draw header info
    tick = tick_data.get('tick', 0)
    draw.text((PADDING, 15), f"GRID ROYALE - Tick {tick}", fill=(0, 245, 255), font=font_large)
    draw.text((WIDTH - PADDING - 100, 15), f"Zone: {zone_min}-{zone_max}", fill=TEXT_COLOR, font=font)
    
    # Draw player info at bottom
    y_offset = HEIGHT - 80
    for i, player in enumerate(players):
        player_id = player['id']
        name = player['name']
        color = BOT_COLORS[i % len(BOT_COLORS)]
        
        # Find current state
        state = next((p for p in player_states if p['botId'] == player_id), None)
        hp = state.get('hp', 0) if state else 0
        alive = state.get('alive', False) if state else False
        
        x_pos = PADDING + i * 200
        draw.ellipse([x_pos, y_offset, x_pos + 20, y_offset + 20], fill=color if alive else (80, 80, 80))
        draw.text((x_pos + 30, y_offset), f"{name}", fill=color if alive else (80, 80, 80), font=font)
        draw.text((x_pos + 30, y_offset + 20), f"HP: {hp}" if alive else "ELIMINATED", fill=TEXT_COLOR, font=font_small)
    
    # Draw events
    events = tick_data.get('events', [])
    for event in events:
        if event.get('type') == 'shot':
            # Draw shot line
            bot_id = event.get('botId')
            direction = event.get('direction')
            from_pos = event.get('from', [0, 0])
            
            if from_pos and direction:
                fx, fy = from_pos
                px1 = PADDING + fx * CELL_SIZE + CELL_SIZE // 2
                py1 = PADDING + (grid_size - 1 - fy) * CELL_SIZE + CELL_SIZE // 2
                
                dx, dy = {'north': (0, 1), 'south': (0, -1), 'east': (1, 0), 'west': (-1, 0)}.get(direction, (0, 0))
                px2 = px1 + dx * CELL_SIZE * 5
                py2 = py1 - dy * CELL_SIZE * 5  # Inverted y
                
                draw.line([px1, py1, px2, py2], fill=(255, 255, 0), width=2)
    
    return img


def generate_video(replay_data: dict, output_path: str, fps: int = 2):
    """Generate video from replay data"""
    history = replay_data.get('history', [])
    players = replay_data.get('players', [])
    grid_size = replay_data.get('grid_size', 15)
    
    if not history:
        print("No history data to render")
        return
    
    print(f"Generating {len(history)} frames...")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Generate frames
        for i, tick_data in enumerate(history):
            frame = draw_frame(tick_data, players, grid_size)
            frame_path = os.path.join(tmpdir, f"frame_{i:04d}.png")
            frame.save(frame_path)
            print(f"  Frame {i+1}/{len(history)}")
        
        # Add final frame with winner (hold for 2 seconds)
        if replay_data.get('winner'):
            final_frame = draw_frame(history[-1], players, grid_size)
            draw = ImageDraw.Draw(final_frame)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
            except:
                font = ImageFont.load_default()
            
            winner_text = f"🏆 {replay_data['winner']} WINS!"
            draw.text((WIDTH // 2 - 100, HEIGHT // 2 - 50), winner_text, fill=(255, 215, 0), font=font)
            
            for j in range(fps * 2):  # 2 seconds
                frame_path = os.path.join(tmpdir, f"frame_{len(history) + j:04d}.png")
                final_frame.save(frame_path)
        
        # Compile to video with ffmpeg
        print("Compiling video...")
        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", os.path.join(tmpdir, "frame_%04d.png"),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
    print(f"✅ Video saved: {output_path}")
    return output_path


def fetch_replay(match_id: str) -> dict:
    """Fetch replay data from Convex"""
    import subprocess
    result = subprocess.run(
        ["npx", "convex", "run", "gridRoyale:getReplay", json.dumps({"matchId": match_id})],
        capture_output=True, text=True, cwd=Path(__file__).parent.parent
    )
    if result.returncode != 0:
        print(f"Error fetching replay: {result.stderr}")
        return {}
    return json.loads(result.stdout)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python generate_replay.py <match_id> [output.mp4]")
        sys.exit(1)
    
    match_id = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else f"replay_{match_id}.mp4"
    
    print(f"Fetching replay for match: {match_id}")
    replay_data = fetch_replay(match_id)
    
    if replay_data:
        generate_video(replay_data, output)
    else:
        print("Failed to fetch replay data")
