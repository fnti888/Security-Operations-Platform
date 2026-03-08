# Screenshots Directory

This directory contains screenshots of the Defense Terminal platform for documentation purposes.

## Required Screenshots

To complete the documentation, please add the following screenshots:

### 1. Dashboard Overview (`dashboard.png`)
Capture the main SOC dashboard showing:
- Live attack feed with geographic visualization
- Incident statistics and metrics
- Real-time threat intelligence
- Quick access panels

Recommended size: 1920x1080 or 2560x1440

### 2. Incident Management (`incidents.png`)
Capture the incident management view showing:
- Incident list with severity indicators
- MITRE ATT&CK technique mappings
- Status workflow (New → Investigating → Contained → Resolved)
- Incident details panel

Recommended size: 1920x1080 or 2560x1440

### 3. Threat Intelligence (`threats.png`)
Capture the threat intelligence view showing:
- Geographic threat map
- Country-level attack statistics
- Threat indicators and IOCs
- Recent attack patterns

Recommended size: 1920x1080 or 2560x1440

### 4. Forensic Tools (`forensics.png`)
Capture one of the forensic tool views:
- Network Monitor with packet capture
- System Monitor with process analysis
- Evidence Locker with chain of custody
- Forensic Timeline with event correlation

Recommended size: 1920x1080 or 2560x1440

## How to Add Screenshots

1. Take screenshots of the application running locally or from your deployed instance
2. Optimize images for web (compress to reduce file size while maintaining quality)
3. Save with the exact filenames listed above
4. Place in this directory (`docs/screenshots/`)

## Image Optimization Tips

- Use PNG format for UI screenshots (better text clarity)
- Compress images using tools like:
  - [TinyPNG](https://tinypng.com)
  - [ImageOptim](https://imageoptim.com)
  - `npm install -g imagemin-cli` (CLI tool)
- Target file size: Under 500KB per image
- Maintain aspect ratio: 16:9 preferred

## Screenshot Guidelines

### Best Practices

- Use realistic but sanitized data (no real IP addresses or sensitive info)
- Ensure good contrast and readability
- Capture during normal business hours (realistic timestamps)
- Show diverse security scenarios
- Include both light and dark theme if applicable
- Annotate key features if needed (use arrows or highlights)

### What to Avoid

- Blurry or low-resolution images
- Screenshots with browser UI (capture application only)
- Real production data or credentials
- Empty states or placeholder data
- Watermarks or branding overlays

## Alternative: Use Placeholder Images

If you prefer to deploy without screenshots initially, you can:

1. Remove the Screenshots section from the main README.md
2. Or replace with text descriptions only
3. Add screenshots later when available

## Need Help?

If you need assistance capturing screenshots:
- Open an issue on GitHub
- Ask in GitHub Discussions
- Contact the maintainers

---

Once you've added screenshots, this README can remain as a guide for future updates.
