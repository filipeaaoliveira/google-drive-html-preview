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
| 12a | **Reload** after replacing the file in Drive with a PDF | Clear "no longer an HTML file" message, not a garbage render |
| 13 | Reload the viewer tab with F5 | Shows "already been opened" message, not a blank page |
| 13a | **Back to Drive** on that "already been opened" page | Navigates to Drive's root — there is no file id on this path — and does not dead-end |
| 13b | **Reload** and **View source** on that "already been opened" page | Both disabled; only **Back to Drive** is live |
| 14 | Popup toggle off | No redirect on any HTML file |
| 15 | Popup toggle back on | Redirect resumes |
| 16 | A large HTML file (> 1 MB) | Renders without truncation |
| 17 | Open an HTML file from a folder listing (Drive's overlay, url stays `/drive/…`) | Renders |
| 18 | Open a PDF from a folder listing | No redirect; Drive's own preview opens |
| 19 | Open an HTML file from a folder, go back to the folder, open a second HTML file | Both render |
| 20 | Preview a video, close it, then open an HTML file in the same session | Renders the HTML file — never the video, whose closed dialog stays in the DOM |
| 21 | Select several files in a folder, then open one | No redirect while the selection is ambiguous |
| 22 | **Back to Drive** after opening an HTML file from a folder | Returns to that folder, not to the file's own page |
| 23 | **Back to Drive** after opening a `/file/d/<id>/view` url directly | Still lands on the file's own page, with no redirect back |
| 24 | Case 22, then let Drive restore the overlay | No redirect loop; the folder stays usable |

Record the browser versions tested and the date alongside the results.

## Results

Not yet run. This matrix requires a browser and a Google account; nothing below
has been executed.

| Run date | Browser | Version | Cases passed | Notes |
|---|---|---|---|---|
| | Chrome | | | |
| | Brave | | | |
