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
    id: 'stratum', name: 'Stratum', category: 'Storage, layer by layer',
    description: 'An S3-compatible storage experiment that connects edge caching, R2, and Telegram behind one object interface.',
    tags: ['TypeScript', 'Workers', 'S3', 'R2'], image: '/assets/stratum-concept.webp',
    imageNote: 'Architecture concept', live: 'https://stratum.opener.workers.dev', repo: 'https://github.com/DebadityaHait/stratum',
    details: 'Extends and rebrands the original TG-S3 architecture with a dashboard, documented object operations, and storage integrity checks.',
    engineering: ['D1 stores object metadata; edge cache, R2, and Telegram serve different storage tiers.', 'Supports object reads, writes, listing, deletion, multipart state, tags, lifecycle rules, and presigned validation.', 'Validates SHA-256 and Content-MD5 when integrity headers are supplied.', 'Deletes and overwrites update metadata synchronously, then clean up backing resources asynchronously.'],
    note: 'This is a storage architecture concept. The default serverless Telegram path supports files up to 20 MB; complete AWS S3 parity is not claimed.',
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
