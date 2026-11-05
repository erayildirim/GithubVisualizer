# Shared because nginx drops inherited add_header directives in any location that declares its own.
# Inline styles are allowed because Recharts and the percentage-width bars set style attributes.
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://avatars.githubusercontent.com; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
