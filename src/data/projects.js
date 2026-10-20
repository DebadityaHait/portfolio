export const projects = [
  {
    id: 'kanvas', name: 'Kanvas', category: 'A little room for big ideas',
    description: 'A graphic design and photo editor that lives in your browser. Start creating locally; add cloud saves when you need them.',
    tags: ['React', 'TypeScript', 'Konva', 'IndexedDB'], image: '/assets/kanvas-actual.jpg',
    imageNote: 'Actual photo editor', live: 'https://kanvas.zlv.uk',
    details: 'A layered, multipage creative workspace with a shared document schema, reversible editing commands, and consistent rendering for the editor and exports.',
    engineering: ['Typed commands and forward/inverse patches power a 200-step undo history.', 'IndexedDB and OPFS preserve local projects. Validated checkpoints recover a damaged latest save.', 'Cloud saving is explicit. Revision-aware writes detect conflicts and preserve competing edits as local copies.', 'Nondestructive photo adjustments preserve originals; exports support PNG, JPEG, WebP, and raster PDF.'],
    note: 'Screenshot of the actual Kanvas photo editor. Explore the live product above. The source repository is private.',
  },
  {
    id: 'pulseflare', name: 'Pulseflare', category: 'Know when things go sideways',
    description: 'Uptime checks, job heartbeats, incident timelines, and evidence-grounded AI chat. Built on Cloudflare’s edge.',
    tags: ['Cloudflare', 'Hono', 'D1', 'Workers AI'], image: '/assets/pulseflare.png',
    imageNote: 'Actual demo workspace', alternateImage: '/assets/pulseflare-incident.png', alternateAlt: 'Actual Pulseflare demo incident investigation', live: 'https://pulseflare.zlv.uk/demo', repo: 'https://github.com/DebadityaHait/pulseflare',
    details: 'A monitoring application with separate API, checker, enrichment, and alert Workers. Monitoring and notifications keep working independently of AI.',
    engineering: ['Atomic D1 leases coordinate overlapping scheduled checks.', 'Check evidence, incident transitions, and an outbox commit together; queues deliver notifications with retries.', 'Private incident chat uses server-selected monitoring evidence and inspectable sources.', 'Public status pages expose selected services and updates, while workspace investigations stay private.'],
    note: 'The screenshot shows the read-only demo with illustrative monitoring data. It is not a claim about production uptime.',
  },
  {
    id: 'onyxbin', name: 'OnyxBin', category: 'Your files. Your little cloud.',
    description: 'A self-hosted file workspace with Telegram-backed storage, an S3-compatible API, and tools to organize, share, and recover files.',
    tags: ['Next.js', 'NestJS', 'Go', 'PostgreSQL', 'S3'], image: '/assets/onyxbin-workspace.webp',
    imageNote: 'Actual file workspace', alternateImage: '/assets/onyxbin-s3.webp', alternateAlt: 'OnyxBin S3 credentials and client configuration',
    live: 'https://onyxbin.zlv.uk/', liveLabel: 'Explore the website', repo: 'https://github.com/DebadityaHait/onyxbin',
    gallery: [
      { label: 'Workspace', image: '/assets/onyxbin-workspace.webp', alt: 'OnyxBin file workspace with folders, image thumbnails, and file-type previews', caption: 'The file workspace: folders, previews, search, and grid or list views.' },
      { label: 'S3 controls', image: '/assets/onyxbin-s3.webp', alt: 'OnyxBin S3 access-key management and AWS CLI setup instructions', caption: 'Named, revocable S3 credentials with Signature V4 and multipart uploads.' },
      { label: 'Transfers', image: '/assets/onyxbin-transfers.webp', alt: 'OnyxBin chunked upload queue showing transfer progress and controls', caption: 'Chunked transfers with progress, cancellation, retry, and conflict handling.' },
      { label: 'Sharing', image: '/assets/onyxbin-sharing.webp', alt: 'OnyxBin file-sharing dialog with link access controls', caption: 'Revocable links for files and folders, managed from the workspace.' },
    ],
    details: 'A Next.js workspace backed by a NestJS control service and a separate Go transfer service. PostgreSQL stores metadata; file chunks live in a private Telegram destination.',
    engineering: ['NestJS handles authentication, metadata, quotas, sharing, and S3 control operations; Go handles streaming, binary I/O, and ZIP downloads.', 'Redis coordinates shared authentication, quota state, and work. Internal services communicate through gRPC with mutual TLS.', 'The S3 object-storage subset supports Signature V4, presigned requests, multipart uploads, and named credentials that can be revoked independently.', 'Chunked uploads support progress, cancellation, and retry. File and folder shares are revocable, and deleted files can be restored from seven-day trash.'],
    note: 'Screenshots show the actual app with an example workspace. The website is a product tour and self-hosting guide. S3 support covers the documented object-storage subset.',
  },
  {
    id: 'shoplense', name: 'ShopLense', category: 'Same groceries. Different prices.',
    description: 'Compare quick-commerce prices and stock in one search, then get notified when a price drops or an item returns.',
    tags: ['Next.js', 'PostgreSQL', 'Node.js', 'Web Push'], image: '/assets/shoplense-comparison.jpg',
    imageNote: 'Actual comparison dashboard', alternateImage: '/assets/shoplense-landing.jpg', alternateAlt: 'Actual ShopLense landing page', repo: 'https://github.com/DebadityaHait/ShopLense',
    details: 'A location-aware comparison app that collects, normalizes, groups, and ranks listings across Zepto, Blinkit, Flipkart Minutes, and Instamart.',
    engineering: ['Concurrent vendor adapters isolate failures so a single unavailable marketplace does not lose every result.', 'Brand, quantity, and cleaned name similarity group comparable products.', 'A background worker evaluates target price, vendor price, price drop, and back-in-stock rules.', 'Web Push and ntfy notifications link back to exact marketplace items.'],
    note: 'Screenshot of the actual ShopLense comparison dashboard. Integrations depend on marketplace behavior and location serviceability.',
  },
];

export const moreProjects = [
  {name:'WoundDoc',kind:'Computer vision',description:'Mobile wound segmentation, calibrated measurement, and visit history. Exploring on-device TensorFlow Lite inference.',url:'https://github.com/DebadityaHait/WoundDoc'},
  {name:'Outlinr',kind:'Document intelligence',description:'Multilingual PDF outline extraction using layout features, rules, and machine learning.',url:'https://github.com/DebadityaHait/outlinr'},
  {name:'PomoTogether',kind:'Mobile',description:'Shared Pomodoro sessions, synchronized timers, and chat for study groups.',url:'https://github.com/DebadityaHait/PomoTogether'},
];

export const contributionEdits = {
  M20: {short:'Ruff',title:'Fix RUF061 context-manager false positives',description:'Added AST parent-context checks so pytest assertion context managers are not mistaken for deprecated callable syntax. Extended snapshots for raises, warns, and deprecated_call, including extra positional arguments and nested calls.',tags:['Rust','AST analysis','Regression snapshots']},
  M2: {short:'TensorFlow',title:'Preserve int64 attributes in oneDNN rewrites',description:'Kept convolution attributes at 64-bit precision through the C++ layout rewrite pass. Out-of-range values now reach InvalidArgumentError handling instead of aborting the process, with convolution kernel regression coverage.',tags:['C++','oneDNN','Kernel validation']},
  M6: {short:'Neovim',title:'Retain UI2 substitute-confirmation highlights',description:'Decoupled interactive substitution highlighting from the global hlsearch setting in the C renderer. Added Lua UI integration coverage that checks grid-cell attributes during confirmation with nohlsearch enabled.',tags:['C','Lua','UI rendering']},
  M7: {short:'Node Redis',title:'Bound Sentinel topology rediscovery retries',description:'Capped post-connect rediscovery attempts during network partitions, with backoff and error propagation when retries are exhausted. Prevents the client from looping indefinitely while waiting for Sentinel topology discovery.',tags:['TypeScript','Redis Sentinel','Failure handling']},
  M16: {short:'Cloudflare',title:'Make the Local Explorer worker selector scrollable',description:'Fixed overflow behavior in the Workers SDK Local Explorer selector so options remain reachable in larger local setups. The change addresses lists extending beyond the nine-worker boundary.',tags:['TypeScript','Workers SDK','UI overflow']},
  M13: {short:'pnpm',title:'Resolve Git dependency names from manifests',description:'Added manifest parsing from Git repository trees in pnpm’s Rust resolver. Package names can be extracted during resolution when a Git-hosted dependency does not provide an explicit name.',tags:['Rust','Manifest parsing','Package resolution']},
  O1: {short:'Safetensors',title:'Reject non-C-contiguous NumPy arrays',description:'Added array-layout validation before serialization to prevent Fortran-order and strided views from being saved as C-order data. The proposed fix returns an actionable ValueError and includes round-trip regression cases.',tags:['Python','Rust','Tensor serialization']},
  O6: {short:'Electron',title:'Normalize partial bounds in BaseWindow',description:'Moved partial-rectangle normalization into BaseWindow, reading current bounds only for missing properties. The proposed change honors Partial<Rectangle> across window types, with coverage for undefined, null, and empty bounds.',tags:['C++','TypeScript','API compatibility']},
  O8: {short:'PyTorch',title:'Validate pixel_shuffle in compile paths',description:'Added positive-factor, int64-overflow, and channel-divisibility checks before shape arithmetic in decompositions and meta implementations. The proposed fix aligns torch.compile and FakeTensor validation with eager execution and includes regression cases.',tags:['Python','torch.compile','Shape validation']},
  O12: {short:'Next.js',title:'Preserve middleware rewrite query parameters',description:'Updated nextUrl construction in App Route request handling to retain query parameters appended by middleware rewrites. The proposed fix keeps Route Handlers from receiving a URL that drops the rewritten search parameters.',tags:['TypeScript','App Router','Request handling']},
  O14: {short:'Kubernetes',title:'Skip zero-valued kubelet device requests',description:'Bypassed device-plugin allocation for zero-valued resource requests in the kubelet Device Manager. The proposed fix avoids container admission failures when a registered plugin has no healthy devices and the pod requests zero.',tags:['Go','Kubelet','Device allocation']},
  O10: {short:'Core ML Tools',title:'Reject symbolic classifier probability shapes',description:'Added static shape validation in the MIL compiler for classifier probability tensors. The proposed change rejects symbolic shapes during model conversion, so unsupported classifier dimensions are reported before reaching runtime compilation.',tags:['Python','MIL compiler','Static validation']},
};
