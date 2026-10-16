declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DEEPSEEK_API_KEY?: string;
    ADMIN_BOOTSTRAP_USERNAME?: string;
    ADMIN_BOOTSTRAP_HASH?: string;
    ADMIN_BOOTSTRAP_SALT?: string;
    SITE_VISIBILITY?: string;
  }
}
