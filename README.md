# AIStor MCP Server

A comprehensive Model Context Protocol (MCP) server for interacting with AIStor and MinIO object stores. This server enables AI agents like Claude to seamlessly manage object storage through natural language interactions.

## 🚀 Features

### 📖 Read Operations
- **List buckets** - Get all buckets with metadata
- **List objects** - Browse bucket contents with filtering
- **Get metadata** - Detailed object information
- **Get tags** - Object and bucket tag management
- **Presigned URLs** - Secure temporary access links
- **Download objects** - Fetch files to local filesystem
- **Local file listing** - Browse allowed directories

### ✍️ Write Operations (--allow-write)
- **Create buckets** - Initialize new storage containers
- **Upload objects** - Store files from local filesystem
- **Text to object** - Create objects from text content
- **Copy objects** - Duplicate between buckets
- **Set tags** - Tag objects and buckets
- **Versioning control** - Manage bucket versioning

### 🗑️ Delete Operations (--allow-delete)
- **Delete objects** - Remove files and versions
- **Delete buckets** - Remove containers (with force option)
- **Move objects** - Transfer between locations

### 🔧 Admin Operations (--allow-admin)
- **Cluster info** - Health and performance metrics
- **Usage statistics** - Storage utilization data
- **Lifecycle policies** - ILM configuration
- **Replication settings** - Cross-region replication
- **Bucket policies** - Access control management

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Access to MinIO/AIStor instance
- Claude Desktop or compatible MCP client

### Quick Start

1. **Clone and install:**
```bash
git clone https://github.com/yourusername/aistor-mcp-server.git
cd aistor-mcp-server
npm install
```

2. **Configure environment:**
```bash
export MINIO_ENDPOINT="your-minio-endpoint.com"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"
export MINIO_USE_SSL="true"
```

3. **Test the server:**
```bash
node server.js --help
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MINIO_ENDPOINT` | `play.min.io` | MinIO server endpoint |
| `MINIO_ACCESS_KEY` | - | Access key for authentication |
| `MINIO_SECRET_KEY` | - | Secret key for authentication |
| `MINIO_USE_SSL` | `true` | Use SSL/TLS connection |
| `ALLOW_WRITE` | `false` | Enable write operations |
| `ALLOW_DELETE` | `false` | Enable delete operations |
| `ALLOW_ADMIN` | `false` | Enable admin operations |
| `ALLOWED_DIRECTORIES` | `/tmp` | Comma-separated allowed directories |
| `MAX_KEYS` | `1000` | Maximum objects to list |

### Command Line Options

```bash
node server.js [options]

Options:
  --allow-write              Enable write operations
  --allow-delete             Enable delete operations  
  --allow-admin              Enable admin operations
  --allowed-directories DIR  Local directory access (comma-separated)
  --max-keys NUM             Max objects in listings
  --help                     Show help
```

## 🔌 Claude Desktop Integration

### Add to Claude Configuration

Edit your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aistor": {
      "command": "node",
      "args": [
        "/path/to/aistor-mcp-server/server.js",
        "--allow-write",
        "--allow-delete", 
        "--allow-admin",
        "--allowed-directories",
        "/Users/YOUR_USERNAME/Downloads,/tmp"
      ],
      "env": {
        "MINIO_ENDPOINT": "your-endpoint.com",
        "MINIO_ACCESS_KEY": "your-access-key",
        "MINIO_SECRET_KEY": "your-secret-key",
        "MINIO_USE_SSL": "true"
      }
    }
  }
}
```

## 🚂 Railway Deployment

### Deploy to Railway

1. **Create Railway service:**
```bash
railway login
railway init
railway link
```

2. **Set environment variables:**
```bash
railway variables set MINIO_ENDPOINT=your-endpoint.com
railway variables set MINIO_ACCESS_KEY=your-access-key
railway variables set MINIO_SECRET_KEY=your-secret-key
railway variables set MINIO_USE_SSL=true
railway variables set ALLOW_WRITE=true
railway variables set ALLOW_DELETE=true
railway variables set ALLOW_ADMIN=true
```

3. **Deploy:**
```bash
railway up
```

### Railway Environment Setup

Add these variables in Railway dashboard:

```
MINIO_ENDPOINT=console-production-7175.up.railway.app
MINIO_ACCESS_KEY=78HClijCHznSsNYDtlpv
MINIO_SECRET_KEY=knKxWMn79ilx6GZsJno4DoPAjboBOY9rWYlv6lIv
MINIO_USE_SSL=true
ALLOW_WRITE=true
ALLOW_DELETE=true
ALLOW_ADMIN=true
ALLOWED_DIRECTORIES=/tmp,/app
MAX_KEYS=1000
```

## 💬 Usage Examples

### Basic Queries
```
"List all my buckets"
"Show contents of my-data bucket"  
"Get metadata for document.pdf in bucket files"
"Create presigned URL for image.jpg valid for 1 hour"
```

### File Operations
```
"Upload report.pdf from Downloads to bucket documents"
"Download config.json from bucket settings to my Desktop"
"Copy backup.sql from bucket-a to bucket-b"
"Move old-file.txt from temp to archive bucket"
```

### Management Tasks
```
"Create bucket called project-files"
"Delete empty test bucket"
"Set tags on document.pdf: category=report, status=final"
"Show storage usage across all buckets"
```

### Admin Operations
```
"Show cluster health and performance"
"Get data usage statistics"
"Check versioning status for bucket main"
"Display lifecycle rules for bucket archives"
```

## 🛠️ Available Tools

### Core Operations
- `list_buckets` - List all buckets
- `list_bucket_contents` - List objects in bucket
- `get_object_metadata` - Object metadata and properties
- `get_object_tags` - Retrieve object tags
- `get_object_presigned_url` - Generate temporary access URLs
- `download_object` - Download to local filesystem
- `list_local_files` - Browse local directories
- `list_allowed_directories` - Show permitted paths

### Write Tools (--allow-write)
- `create_bucket` - Create new buckets
- `upload_object` - Upload from local files
- `text_to_object` - Create objects from text
- `copy_object` - Copy between buckets
- `set_object_tags` - Tag management
- `set_bucket_tags` - Bucket tagging
- `set_bucket_versioning` - Version control

### Delete Tools (--allow-delete)
- `delete_object` - Remove objects/versions
- `delete_bucket` - Remove buckets
- `move_object` - Move between buckets

### Admin Tools (--allow-admin)
- `get_admin_info` - Cluster information
- `get_data_usage_info` - Storage statistics
- `get_bucket_versioning` - Version settings
- `get_bucket_tags` - Bucket tag info
- `get_bucket_lifecycle` - ILM policies
- `get_bucket_replication` - Replication config

## 🔒 Security

### Permission Levels
- **Read-only** (default): Safe browsing and downloading
- **Write enabled**: Object and bucket creation
- **Delete enabled**: Removal operations
- **Admin enabled**: Cluster management

### Path Security
- Local file access restricted to `--allowed-directories`
- Path traversal attacks prevented
- Relative path resolution secured

### Best Practices
- Use least privilege principle
- Rotate access keys regularly
- Monitor admin operations
- Restrict allowed directories
- Use SSL/TLS connections

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test MinIO connectivity
node -e "
const { Client } = require('minio');
const client = new Client({
  endPoint: 'your-endpoint',
  accessKey: 'your-key',
  secretKey: 'your-secret',
  useSSL: true
});
client.listBuckets().then(console.log).catch(console.error);
"
```

### Permission Errors
- Check `--allow-*` flags match your needs
- Verify allowed directories include target paths
- Confirm MinIO credentials have required permissions

### Claude Integration
- Restart Claude Desktop after config changes
- Check config file JSON syntax
- Verify file paths are absolute
- Review Claude error logs

## 📋 API Reference

### Tool Schema
Each tool follows MCP standard with:
- `name` - Tool identifier
- `description` - Human readable purpose
- `inputSchema` - JSON schema for parameters

### Response Format
All tools return:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "Result data or JSON"
    }
  ]
}
```

### Error Handling
- Permission errors for disabled operations
- Path validation for local file access
- MinIO client errors with context
- Graceful degradation for missing features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Setup
```bash
git clone https://github.com/yourusername/aistor-mcp-server.git
cd aistor-mcp-server
npm install
npm run dev  # Start with inspector
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [MinIO](https://min.io/) for excellent object storage
- [Claude](https://claude.ai/) for AI agent capabilities

## 📞 Support

- 📧 Issues: [GitHub Issues](https://github.com/yourusername/aistor-mcp-server/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/aistor-mcp-server/discussions)
- 📖 Documentation: [Wiki](https://github.com/yourusername/aistor-mcp-server/wiki)

---

**Ready to supercharge your AI workflows with object storage! 🚀**
