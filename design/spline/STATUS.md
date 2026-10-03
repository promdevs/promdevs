# Apollo Spline prototype

Scene: https://app.spline.design/file/5d2cae20-34fb-4659-9388-cab04d8529e7

This is an unfinished, visually unapproved prototype. Do not integrate it into the website yet.

## Implemented

- Imported the adapted public-domain Apollo sculpture.
- Imported MIT-licensed anatomical hands and original arm meshes.
- Built the desk, keyboard, monitor, branding and code text.
- Corrected keycap materials and removed spacebar overlap.
- Created world-space editable hand meshes for code-driven finger deformation.
- Added a first finger/key animation loop, pause control, reduced-motion detection,
  and background-tab motion suspension in Spline's HTML layer.

## Visual review

The left shoulder/arm join looks assembled and anatomically unconvincing.
The torso is a cropped museum bust, not a seated character. This approach needs
proper anatomical remodeling before it meets the requested visual standard.
Animation contact/timing and pause behavior have not passed detailed verification.
No website export or integration was performed. No AI credits or purchases were used.

## Import details

The arms asset imported successfully after the native picker initially stalled.
Spline normalized its HEIGHT to 500 without recentering the authored coordinates.
The imported group is scaled by 0.03800385284423828, position (0,0,0).
Original imported hands and arms are hidden; replacements are named Apollo Typing
Left/Right and Apollo Fitted Left/Right Arm. Keep the originals for revision.

## Remaining

- Remodel anatomical shoulder, upper arm, elbow and wrist transitions.
- Refine finger/key contact and synchronize exact finger/key mapping.
- Correct seated torso silhouette, gaze, screen orientation and responsive camera.
- Add head movement, brand reveal, pointer parallax and light-theme treatment.
- Verify playback, reduced motion, pause, mobile, performance and export.

See THIRD-PARTY.md for asset provenance.
