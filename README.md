# AIStor MCP Server

A comprehensive Model Context Protocol (MCP) server for interacting with MinIO and AIStor object stores. This server enables AI agents like Claude to seamlessly manage object storage through natural language interactions.

**✨ Successfully tested and working with Railway deployment and remote MCP connections!**

## 🚀 Features

### 📖 Read Operations
- **List buckets** - Get all buckets with metadata
- **List objects** - Browse bucket contents with filtering
- **Get metadata** - Detailed object information
- **Get tags** - Object and bucket tag management
- **Presigned URLs** - Secure temporary access links
- **Download objects** - Fetch files to local filesystem

### ✍️ Write Operations
- **Create buckets** - Initialize new storage containers
- **Upload objects** - Store files from local filesystem
- **Text to object** - Create objects from text content
- **Copy objects** - Duplicate between buckets
- **Set tags** - Tag objects and buckets

### 🗑️ Delete Operations
- **Delete objects** - Remove files and versions
- **Delete buckets** - Remove containers (with force option)
- **Move objects** - Transfer between locations

### 🔧 Admin Operations
- **Cluster info** - Health and performance metrics
- **Usage statistics** - Storage utilization data
- **Admin functions** - Comprehensive cluster management

## 📦 Installation

### Prerequisites
- Node.js 18+
- MinIO/AIStor instance
- Claude Desktop or compatible MCP client

### Quick Start

1. **Clone and install:**
```bash
git clone https://github.com/kimbo128/AIStor-MCP-Server.git
cd AIStor-MCP-Server
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your MinIO credentials
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
| `ALLOW_WRITE` | `true` | Enable write operations |
| `ALLOW_DELETE` | `true` | Enable delete operations |
| `ALLOW_ADMIN` | `true` | Enable admin operations |
| `HTTP_MODE` | `true` | Enable HTTP mode for Railway |
| `PORT` | `8080` | Server port |

### Command Line Options

```bash
node server.js [options]

Options:
  --allow-write              Enable write operations
  --allow-delete             Enable delete operations  
  --allow-admin              Enable admin operations
  --http                     Enable HTTP mode
  --port NUM                 Server port
  --help                     Show help
```

## 🚂 Railway Deployment

### Deploy to Railway

1. **Create Railway service from GitHub:**
```bash
# Connect your GitHub repository to Railway
# Railway will auto-detect Node.js and deploy
```

2. **Set environment variables in Railway:**
```bash
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=true
ALLOW_WRITE=true
ALLOW_DELETE=true
ALLOW_ADMIN=true
HTTP_MODE=true
NODE_TLS_REJECT_UNAUTHORIZED=0
```

3. **Deploy automatically via git push**

### Railway Configuration File

The included `railway.json` ensures proper deployment:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

## 🔌 Claude Desktop Integration

### Local STDIO Mode

For local development, configure Claude Desktop:

```json
{
  "mcpServers": {
    "aistor": {
      "command": "node",
      "args": [
        "/path/to/AIStor-MCP-Server/server.js",
        "--allow-write",
        "--allow-delete", 
        "--allow-admin"
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

### Remote Railway Mode

For Railway deployment, use mcp-remote:

```json
{
  "mcpServers": {
    "aistor": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-railway-app.up.railway.app/mcp"
      ],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
```

## 💬 Usage Examples

### Basic Operations
```
"List all my buckets"
"Show contents of my-data bucket"  
"Get metadata for document.pdf in bucket files"
"Create presigned URL for image.jpg valid for 1 hour"
```

### File Operations
```
"Create a bucket called project-files"
"Upload text content to bucket/file.txt"
"Delete empty test bucket"
"Show storage usage statistics"
```

### Admin Operations
```
"Show cluster health and performance"
"Get data usage statistics"
"Display admin information"
```

## 🛠️ Available Tools

The server provides the following MCP tools:

- **list_buckets** - List all buckets
- **list_bucket_contents** - List objects in bucket
- **get_object_metadata** - Object metadata and properties
- **get_object_presigned_url** - Generate temporary access URLs
- **create_bucket** - Create new buckets
- **text_to_object** - Create objects from text
- **delete_object** - Remove objects
- **delete_bucket** - Remove buckets
- **get_admin_info** - Cluster information
- **get_data_usage_info** - Storage statistics

## 🔒 Security

### Permission Levels
- **Read-only** mode available for safe operations
- **Write enabled**: Object and bucket creation
- **Delete enabled**: Removal operations  
- **Admin enabled**: Cluster management

### Best Practices
- Use least privilege principle
- Rotate access keys regularly
- Use SSL/TLS in production
- Monitor admin operations
- Validate environment variables

## 🐛 Troubleshooting

### Common Issues

**Connection Errors:**
- Verify MINIO_ENDPOINT is correct API endpoint (not console)
- Check credentials match your MinIO instance
- Ensure SSL settings match your server setup

**Railway Deployment:**
- Confirm all environment variables are set
- Check Railway logs for startup errors
- Verify HTTP_MODE=true for remote access

**Claude Integration:**
- Restart Claude Desktop after config changes
- Check MCP server logs for connection attempts
- Verify JSON-RPC responses are properly formatted

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [MinIO](https://min.io/) for excellent object storage
- [Railway](https://railway.app/) for seamless deployment
- [Claude](https://claude.ai/) for AI agent capabilities

## ⭐ Star History

If this project helped you, please consider giving it a star! It helps others discover this tool.

---

**Ready to supercharge your AI workflows with object storage!** 🚀

For questions or support, please open an issue on GitHub.
