from PIL import Image

def remove_white_bg(input_path, output_path, threshold=245):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    newData = []
    for item in data:
        # item is (R, G, B, A)
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0)) # transparent
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

files = ["robotic_arm_iso", "road_supplier_iso"]
for f in files:
    remove_white_bg(f"public/{f}.jpg", f"public/{f}.png")
