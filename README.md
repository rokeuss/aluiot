[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Cache-Control = "no-cache"

[[headers]]
  for = "/data/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
