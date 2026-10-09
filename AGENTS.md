<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Device activation: the app asks /api/public/activate, which forwards the MAC to the reseller panel at PANEL_URL. Why: the panel URL and its reply format live in one place.
- http streams play through /api/public/stream, which rewrites HLS manifests. Why: browsers block http video inside an https page.
- Catalog/list data loads through src/lib/transport.ts (native HTTP in the APK, then direct fetch, then server relay). Why: IPTV servers block datacenter IPs, so requests must come from the customer's device.
- TV remote navigation uses [data-nav] elements plus useBack() from src/lib/remote.ts. Why: one spatial-focus system works with every remote model.
- The APK is a Capacitor shell that opens the published app URL, built by .github/workflows/android-apk.yml. Why: no Android SDK in the editor, and web updates reach installed devices without reinstalling.
