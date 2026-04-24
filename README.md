# 🖥️ 2D Computer Building Simulator

A web-based computer building simulator where you can select and assemble PC components with real-time compatibility checking.

## Features

✨ **Interactive Component Selection** - Browse through 25+ computer components across 8 categories
🔧 **2D PC Visualization** - Visual representation of your build on a 2D canvas
✓ **Real-time Compatibility Checking** - Automatic detection of component incompatibilities
💰 **Build Statistics** - Track total cost, power consumption, RAM, and storage
💾 **Save & Load Builds** - Save your favorite builds and load them later
📊 **Detailed Component Information** - View complete specifications for each component

## Component Categories

- **CPU** - Intel and AMD processors with socket info, core count, and power specs
- **GPU** - Graphics cards with VRAM and power requirements
- **RAM** - Memory options with DDR4/DDR5 support
- **Motherboard** - Socket compatibility and form factor support
- **Storage** - NVMe SSDs with capacity and speed info
- **PSU** - Power supplies with wattage and efficiency ratings
- **Case** - Computer cases with GPU length support
- **Cooler** - CPU coolers with compatibility checking

## System Requirements

- Python 3.8 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation & Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Application

```bash
python main.py
```

You should see output like:
```
 * Running on http://127.0.0.1:5000
 * Press CTRL+C to quit
```

### 3. Open in Browser

Navigate to **http://localhost:5000** in your web browser.

## How to Use

### Building Your PC

1. **Select Components**: Browse the left panel and click on components to view details
2. **Add to Build**: Click "Add to Build" in the details modal
3. **View Compatibility**: The right panel shows compatibility status in real-time
4. **Visualize**: The center canvas shows your PC build visually
5. **Check Stats**: Review price, power consumption, RAM, and storage in real-time

### Understanding Compatibility Checks

The simulator checks for:
- **CPU-Motherboard Compatibility**: Verifies matching socket types (LGA1700, AM5)
- **RAM Compatibility**: Ensures DDR5 for Intel LGA1700, DDR4/DDR5 for AMD AM5
- **Cooler Compatibility**: Matches socket support and checks TDP adequacy
- **GPU-Case Fit**: Ensures GPU length fits within case specifications

### Saving & Loading Builds

1. **Save**: Click "Save Build" button, optionally name it, and confirm
2. **Load**: Click "Load Build" to see your saved builds
3. **Delete**: Remove builds you no longer need

### Removing Components

Click the ✕ button next to any component in the right panel to remove it.

## Project Structure

```
AssemblyProj/
├── main.py                 # Flask server and API endpoints
├── database.py             # Component database and logic
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html         # Main HTML interface
└── static/
    ├── css/
    │   └── style.css      # Styling
    └── js/
        └── simulator.js   # Interactive functionality
```

## API Endpoints

- `GET /` - Main page
- `GET /api/components` - Get all components
- `GET /api/components/<category>` - Get components by category
- `POST /api/compatibility` - Check build compatibility
- `POST /api/stats` - Calculate build statistics
- `GET /api/builds` - Get all saved builds
- `POST /api/builds` - Save a new build
- `GET /api/builds/<id>` - Get specific build
- `DELETE /api/builds/<id>` - Delete a build

## Component Details

### CPU (Central Processing Unit)
- **Key Specs**: Cores, threads, boost clock, TDP, socket type
- **Impact**: Determines overall performance and motherboard socket

### Motherboard
- **Key Specs**: Socket type, RAM slots, PCIe slots, form factor
- **Impact**: Compatibility hub for all components

### RAM (Memory)
- **Key Specs**: Capacity, speed, type (DDR4/DDR5), latency
- **Impact**: System responsiveness and multitasking ability

### GPU (Graphics Card)
- **Key Specs**: VRAM, memory bandwidth, interface, power consumption
- **Impact**: Gaming and graphics performance

### Storage
- **Key Specs**: Capacity, type, interface, read speed
- **Impact**: Load times and storage space

### PSU (Power Supply)
- **Key Specs**: Wattage, efficiency rating, modularity
- **Impact**: Must support total system power draw

### Case
- **Key Specs**: Form factor, GPU length support
- **Impact**: Physical compatibility and component fit

### Cooler
- **Key Specs**: Cooling capacity, socket compatibility, type (Air/Liquid)
- **Impact**: CPU temperature management

## Example Builds

### Budget Gaming ($1,200)
- CPU: Intel Core i5-13600K
- GPU: NVIDIA RTX 4070
- RAM: Kingston Fury Beast 32GB DDR5
- Motherboard: MSI MPG Z790 Edge WiFi
- Storage: Crucial P5 Plus 1TB
- PSU: SeaSonic Focus GX-850
- Case: NZXT H510 Flow
- Cooler: Noctua NH-D15

### High-End Workstation ($3,500+)
- CPU: Intel Core i9-13900K or AMD Ryzen 9 7950X
- GPU: NVIDIA RTX 4090
- RAM: Corsair Vengeance DDR5 64GB
- Motherboard: ASUS ROG Maximus Z790 Hero
- Storage: Samsung 990 Pro 2TB
- PSU: Corsair RM1200x
- Case: Lian Li Lancool 3
- Cooler: ARCTIC Liquid Freezer II 360

## Tips for Building

1. **Start with CPU + Motherboard**: These determine socket compatibility
2. **Choose RAM based on Motherboard**: DDR5 for new platforms, DDR4 for older
3. **Consider Power Consumption**: Ensure PSU wattage is 20-25% above system draw
4. **Check Case Compatibility**: Verify GPU length and motherboard form factor
5. **Match Cooler to CPU**: Ensure cooling capacity exceeds CPU TDP
6. **Balance Performance & Budget**: High-end doesn't always mean best value

## Customization

To add new components, edit `database.py` in the `_initialize_components()` method:

```python
'cpu': [
    {
        'id': 'cpu_custom',
        'name': 'Your Component Name',
        'brand': 'Brand',
        'price': 199,
        'power': 125,
        # Add other relevant specs
    }
]
```

## Troubleshooting

### Port 5000 already in use
Change the port in `main.py`:
```python
app.run(debug=True, port=5001)
```

### "Cannot connect to server"
Ensure Flask is running and the server shows `Running on http://127.0.0.1:5000`

### Components not loading
Check browser console (F12) for JavaScript errors

## Future Enhancements

- 🔄 More realistic 3D visualization
- 🎨 Component customization colors
- 🌐 Multiple build sharing via URLs
- 📱 Mobile app version
- 🎯 Pre-configured build templates
- 💿 Actual component database with real prices
- 🚀 Performance benchmarking
- 🔌 Cable management simulation

## Contributing

Feel free to enhance this simulator by:
- Adding more components to the database
- Improving the 2D visualization
- Adding new compatibility rules
- Optimizing performance

## License

Open source - feel free to use and modify for learning purposes.

## Support

For issues or suggestions, check the code comments or modify `main.py` and `database.py` to extend functionality.

---

**Happy Building! 🖥️**
