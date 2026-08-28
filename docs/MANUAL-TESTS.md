# Manual test matrix

Run before every release, in both Chrome and Brave (default shields).

| # | Case | Expected |
|---|---|---|
| 1 | Self-contained HTML file, no scripts | Renders |
| 2 | HTML file with an inline `<script>` | Renders, script runs |
| 3 | HTML file loading a CDN script or stylesheet over https | Renders, remote resource applies |
| 4 | A `.htm` file | Renders |
| 5 | A PDF in Drive | No redirect; Drive behaves normally |
| 6 | A Drive-native Google Doc | No redirect; Docs opens normally |
| 7 | A `.txt` or `.md` file | No redirect |
| 8 | A file you lack permission to read | No redirect; Drive's own error shows |
| 9 | Signed out of Google | No redirect; Drive's sign-in flow is untouched |
| 10 | **View source** button | Shows escaped source; toggles back to the render |
| 11 | **Back to Drive** button | Drive's code view loads and does not redirect back |
| 12 | **Reload** button | Re-fetches and re-renders current file content |
| 13 | Reload the viewer tab with F5 | Shows "already been opened" message, not a blank page |
| 14 | Popup toggle off | No redirect on any HTML file |
| 15 | Popup toggle back on | Redirect resumes |
| 16 | A large HTML file (> 1 MB) | Renders without truncation |

Record the browser versions tested and the date alongside the results.

## Results

Not yet run. This matrix requires a browser and a Google account; nothing below
has been executed.

| Run date | Browser | Version | Cases passed | Notes |
|---|---|---|---|---|
| | Chrome | | | |
| | Brave | | | |
