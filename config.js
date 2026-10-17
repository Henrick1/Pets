(function (root) {
  const config = {
    supabaseUrl: "https://nnysxczifguvmcoktbhc.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueXN4Y3ppZmd1dm1jb2t0YmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzAyNjAsImV4cCI6MjEwNzg0NjI2MH0.K6ogJQkWqJsKCMwyRqLT14pBnmkMF6wH3l0RvNAQjgg"
  };
  if (typeof module === "object" && module.exports) module.exports = config;
  else root.PETS_CONFIG = config;
})(typeof self !== "undefined" ? self : this);
