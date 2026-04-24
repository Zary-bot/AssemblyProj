

from flask import Flask, render_template, jsonify, request
from database import Database
import json

app = Flask(__name__)
db = Database()

# ==================== PAGE ROUTES ====================

@app.route('/')
def index():
    """Render the main index page"""
    return render_template('index.html')

# ==================== COMPONENT API ENDPOINTS ====================

@app.route('/api/components', methods=['GET'])
def get_components():
    """Get all available components categorized by type"""
    components = db.get_all_components()
    return jsonify(components)

@app.route('/api/components/<category>', methods=['GET'])
def get_components_by_category(category):
    """Get components by category (cpu, gpu, ram, etc.)"""
    components = db.get_components_by_category(category)
    return jsonify(components)

@app.route('/api/components/<category>/<component_id>', methods=['GET'])
def get_component_details(category, component_id):
    """Get detailed specs for a specific component"""
    component = db.get_component_details(category, component_id)
    if component:
        return jsonify(component)
    return jsonify({'error': 'Component not found'}), 404

# ==================== BUILD COMPATIBILITY & STATS ====================

@app.route('/api/compatibility', methods=['POST'])
def check_compatibility():
    """Check if selected components are compatible"""
    data = request.json
    is_compatible, issues = db.check_compatibility(data)
    
    # Calculate total power
    total_power = db.calculate_total_power(data)
    
    return jsonify({
        'compatible': is_compatible,
        'issues': issues,
        'totalPower': total_power
    })

@app.route('/api/stats', methods=['POST'])
def calculate_stats():
    """Calculate comprehensive build statistics"""
    data = request.json
    stats = db.calculate_stats(data)
    return jsonify(stats)

# ==================== BUILD MANAGEMENT ====================

@app.route('/api/builds', methods=['GET'])
def get_builds():
    """Get all saved builds"""
    builds = db.get_all_builds()
    return jsonify(builds)

@app.route('/api/builds', methods=['POST'])
def save_build():
    """Save a new build"""
    data = request.json
    build_id = db.save_build(data)
    return jsonify({'id': build_id, 'success': True})

@app.route('/api/builds/<build_id>', methods=['GET'])
def get_build(build_id):
    """Get a specific build"""
    build = db.get_build(build_id)
    if build:
        return jsonify(build)
    return jsonify({'error': 'Build not found'}), 404

@app.route('/api/builds/<build_id>', methods=['PUT'])
def update_build(build_id):
    """Update an existing build"""
    data = request.json
    success = db.update_build(build_id, data)
    if success:
        return jsonify({'success': True, 'id': build_id})
    return jsonify({'error': 'Build not found'}), 404

@app.route('/api/builds/<build_id>', methods=['DELETE'])
def delete_build(build_id):
    """Delete a build"""
    success = db.delete_build(build_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Build not found'}), 404

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

# ==================== APPLICATION STARTUP ====================

if __name__ == '__main__':
    app.run(debug=True, port=5000)
