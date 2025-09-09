#!/usr/bin/env node

/**
 * AIStor MCP Server - Model Context Protocol Server for MinIO/AIStor
 * Provides AI agents with comprehensive object storage capabilities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'minio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AistorMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'aistor-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Configuration
    this.config = {
      endpoint: process.env.MINIO_ENDPOINT || 'play.min.io',
      accessKey: process.env.MINIO_ACCESS_KEY || 'Q3AM3UQ867SPQQA43P2F',
      secretKey: process.env.MINIO_SECRET_KEY || 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG',
      useSSL: process.env.MINIO_USE_SSL === 'true' || true,
      allowWrite: process.env.ALLOW_WRITE === 'true' || false,
      allowDelete: process.env.ALLOW_DELETE === 'true' || false,
      allowAdmin: process.env.ALLOW_ADMIN === 'true' || false,
      allowedDirectories: (process.env.ALLOWED_DIRECTORIES || '/tmp').split(','),
      maxKeys: parseInt(process.env.MAX_KEYS || '1000', 10),
    };

    // Initialize MinIO client
    this.minioClient = new Client({
      endPoint: this.config.endpoint,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
      useSSL: this.config.useSSL,
    });

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        // Basic operations
        {
          name: 'list_buckets',
          description: 'List all buckets in the AIStor object store with their basic information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_bucket_contents',
          description: 'List all objects in a specified bucket, including their sizes and last modified dates',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Name of the bucket' },
              prefix: { type: 'string', description: 'Prefix to filter objects (optional)' },
              versions: { type: 'boolean', description: 'Include object versions (optional)' },
            },
            required: ['bucket'],
          },
        },
        {
          name: 'get_object_metadata',
          description: 'Get detailed metadata of an object including content type, size, custom headers, and system properties',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Name of the bucket' },
              object: { type: 'string', description: 'Name of the object' },
              versionId: { type: 'string', description: 'Specific version ID (optional)' },
            },
            required: ['bucket', 'object'],
          },
        },
        {
          name: 'get_object_tags',
          description: 'Get all tags associated with a specific object in a bucket',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Name of the bucket' },
              object: { type: 'string', description: 'Name of the object' },
              versionId: { type: 'string', description: 'Specific version ID (optional)' },
            },
            required: ['bucket', 'object'],
          },
        },
        {
          name: 'get_object_presigned_url',
          description: 'Get a presigned URL for an object in a bucket, with an optional expiration time. Default is 7 days.',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Name of the bucket' },
              object: { type: 'string', description: 'Name of the object' },
              expiry: { type: 'number', description: 'Expiration time in seconds (default: 604800 = 7 days)' },
            },
            required: ['bucket', 'object'],
          },
        },
        {
          name: 'download_object',
          description: 'Download an object from a specified bucket to the local filesystem, preserving metadata',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Name of the bucket' },
              object: { type: 'string', description: 'Name of the object' },
              localPath: { type: 'string', description: 'Local file path to save the object' },
              versionId: { type: 'string', description: 'Specific version ID (optional)' },
            },
            required: ['bucket', 'object', 'localPath'],
          },
        },
        {
          name: 'list_local_files',
          description: 'List all files and directories in a specified local directory path with their attributes',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Local directory path to list' },
            },
            required: ['directory'],
          },
        },
        {
          name: 'list_allowed_directories',
          description: 'List all directories that are permitted for operations with the server',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      // Add write operations if enabled
      if (this.config.allowWrite) {
        tools.push(
          {
            name: 'create_bucket',
            description: 'Create a new bucket with specified configurations and optional versioning settings',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket to create' },
                region: { type: 'string', description: 'Region for the bucket (optional)' },
              },
              required: ['bucket'],
            },
          },
          {
            name: 'upload_object',
            description: 'Upload a file from local filesystem to a specified bucket',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                object: { type: 'string', description: 'Name of the object in the bucket' },
                localPath: { type: 'string', description: 'Local file path to upload' },
                contentType: { type: 'string', description: 'Content type (optional)' },
              },
              required: ['bucket', 'object', 'localPath'],
            },
          },
          {
            name: 'text_to_object',
            description: 'Convert text to an object in a bucket, with support for different content types',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                object: { type: 'string', description: 'Name of the object in the bucket' },
                text: { type: 'string', description: 'Text content to upload' },
                contentType: { type: 'string', description: 'Content type (default: text/plain)' },
              },
              required: ['bucket', 'object', 'text'],
            },
          },
          {
            name: 'copy_object',
            description: 'Copy an object from one bucket to another while preserving metadata and optionally modifying properties',
            inputSchema: {
              type: 'object',
              properties: {
                sourceBucket: { type: 'string', description: 'Source bucket name' },
                sourceObject: { type: 'string', description: 'Source object name' },
                destBucket: { type: 'string', description: 'Destination bucket name' },
                destObject: { type: 'string', description: 'Destination object name' },
                versionId: { type: 'string', description: 'Specific version ID (optional)' },
              },
              required: ['sourceBucket', 'sourceObject', 'destBucket', 'destObject'],
            },
          },
          {
            name: 'set_object_tags',
            description: 'Set or update tags for an existing object in a bucket, supporting multiple key-value pairs',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                object: { type: 'string', description: 'Name of the object' },
                tags: { type: 'object', description: 'Key-value pairs of tags' },
                versionId: { type: 'string', description: 'Specific version ID (optional)' },
              },
              required: ['bucket', 'object', 'tags'],
            },
          },
          {
            name: 'set_bucket_tags',
            description: 'Set the tags for a specified bucket',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                tags: { type: 'object', description: 'Key-value pairs of tags' },
              },
              required: ['bucket', 'tags'],
            },
          },
          {
            name: 'set_bucket_versioning',
            description: 'Configure versioning settings for a bucket with administrative privileges',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                enabled: { type: 'boolean', description: 'Enable or disable versioning' },
              },
              required: ['bucket', 'enabled'],
            },
          }
        );
      }

      // Add delete operations if enabled
      if (this.config.allowDelete) {
        tools.push(
          {
            name: 'delete_object',
            description: 'Delete a specific object or version from a bucket, with optional soft delete support',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                object: { type: 'string', description: 'Name of the object' },
                versionId: { type: 'string', description: 'Specific version ID (optional)' },
              },
              required: ['bucket', 'object'],
            },
          },
          {
            name: 'delete_bucket',
            description: 'Delete a bucket and optionally force removal of all contained objects',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
                force: { type: 'boolean', description: 'Force delete even if bucket is not empty' },
              },
              required: ['bucket'],
            },
          },
          {
            name: 'move_object',
            description: 'Move an object between buckets by copying to destination and removing from source',
            inputSchema: {
              type: 'object',
              properties: {
                sourceBucket: { type: 'string', description: 'Source bucket name' },
                sourceObject: { type: 'string', description: 'Source object name' },
                destBucket: { type: 'string', description: 'Destination bucket name' },
                destObject: { type: 'string', description: 'Destination object name' },
                versionId: { type: 'string', description: 'Specific version ID (optional)' },
              },
              required: ['sourceBucket', 'sourceObject', 'destBucket', 'destObject'],
            },
          }
        );
      }

      // Add admin operations if enabled
      if (this.config.allowAdmin) {
        tools.push(
          {
            name: 'get_admin_info',
            description: 'Get comprehensive technical information about the AIStor object store, including status, performance metrics, and configuration',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_data_usage_info',
            description: 'Get data usage information for the AIStor object store including total data stored, number of objects, and usage by each bucket',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_bucket_versioning',
            description: 'Get the versioning status and configuration of a specified bucket',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
              },
              required: ['bucket'],
            },
          },
          {
            name: 'get_bucket_tags',
            description: 'Get the tags of a specified bucket',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
              },
              required: ['bucket'],
            },
          },
          {
            name: 'get_bucket_lifecycle',
            description: 'Get the lifecycle also known as lifecycle rules also known as ILM configuration of a specified bucket',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
              },
              required: ['bucket'],
            },
          },
          {
            name: 'get_bucket_replication',
            description: 'Get the replication configuration of a specified bucket',
            inputSchema: {
              type: 'object',
              properties: {
                bucket: { type: 'string', description: 'Name of the bucket' },
              },
              required: ['bucket'],
            },
          }
        );
      }

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_buckets':
            return await this.listBuckets();
          case 'list_bucket_contents':
            return await this.listBucketContents(args.bucket, args.prefix, args.versions);
          case 'get_object_metadata':
            return await this.getObjectMetadata(args.bucket, args.object, args.versionId);
          case 'get_object_tags':
            return await this.getObjectTags(args.bucket, args.object, args.versionId);
          case 'get_object_presigned_url':
            return await this.getObjectPresignedUrl(args.bucket, args.object, args.expiry);
          case 'download_object':
            return await this.downloadObject(args.bucket, args.object, args.localPath, args.versionId);
          case 'list_local_files':
            return await this.listLocalFiles(args.directory);
          case 'list_allowed_directories':
            return await this.listAllowedDirectories();

          // Write operations
          case 'create_bucket':
            this.checkWritePermission();
            return await this.createBucket(args.bucket, args.region);
          case 'upload_object':
            this.checkWritePermission();
            return await this.uploadObject(args.bucket, args.object, args.localPath, args.contentType);
          case 'text_to_object':
            this.checkWritePermission();
            return await this.textToObject(args.bucket, args.object, args.text, args.contentType);
          case 'copy_object':
            this.checkWritePermission();
            return await this.copyObject(args.sourceBucket, args.sourceObject, args.destBucket, args.destObject, args.versionId);
          case 'set_object_tags':
            this.checkWritePermission();
            return await this.setObjectTags(args.bucket, args.object, args.tags, args.versionId);
          case 'set_bucket_tags':
            this.checkWritePermission();
            return await this.setBucketTags(args.bucket, args.tags);
          case 'set_bucket_versioning':
            this.checkWritePermission();
            return await this.setBucketVersioning(args.bucket, args.enabled);

          // Delete operations
          case 'delete_object':
            this.checkDeletePermission();
            return await this.deleteObject(args.bucket, args.object, args.versionId);
          case 'delete_bucket':
            this.checkDeletePermission();
            return await this.deleteBucket(args.bucket, args.force);
          case 'move_object':
            this.checkDeletePermission();
            return await this.moveObject(args.sourceBucket, args.sourceObject, args.destBucket, args.destObject, args.versionId);

          // Admin operations
          case 'get_admin_info':
            this.checkAdminPermission();
            return await this.getAdminInfo();
          case 'get_data_usage_info':
            this.checkAdminPermission();
            return await this.getDataUsageInfo();
          case 'get_bucket_versioning':
            this.checkAdminPermission();
            return await this.getBucketVersioning(args.bucket);
          case 'get_bucket_tags':
            this.checkAdminPermission();
            return await this.getBucketTags(args.bucket);
          case 'get_bucket_lifecycle':
            this.checkAdminPermission();
            return await this.getBucketLifecycle(args.bucket);
          case 'get_bucket_replication':
            this.checkAdminPermission();
            return await this.getBucketReplication(args.bucket);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  // Permission checks
  checkWritePermission() {
    if (!this.config.allowWrite) {
      throw new Error('Write operations are not enabled. Add --allow-write flag to enable.');
    }
  }

  checkDeletePermission() {
    if (!this.config.allowDelete) {
      throw new Error('Delete operations are not enabled. Add --allow-delete flag to enable.');
    }
  }

  checkAdminPermission() {
    if (!this.config.allowAdmin) {
      throw new Error('Admin operations are not enabled. Add --allow-admin flag to enable.');
    }
  }

  // Basic operations
  async listBuckets() {
    const buckets = await this.minioClient.listBuckets();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(buckets, null, 2),
        },
      ],
    };
  }

  async listBucketContents(bucket, prefix = '', versions = false) {
    const objects = [];
    const stream = this.minioClient.listObjects(bucket, prefix, true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        objects.push(obj);
        if (objects.length >= this.config.maxKeys) {
          stream.destroy();
        }
      });
      
      stream.on('end', () => {
        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ objects, truncated: objects.length >= this.config.maxKeys }, null, 2),
            },
          ],
        });
      });
      
      stream.on('error', reject);
    });
  }

  async getObjectMetadata(bucket, object, versionId) {
    const metadata = await this.minioClient.statObject(bucket, object, versionId ? { versionId } : {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  }

  async getObjectTags(bucket, object, versionId) {
    try {
      const tags = await this.minioClient.getObjectTagging(bucket, object, versionId ? { versionId } : {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tags, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No tags found for object ${object} in bucket ${bucket}`,
          },
        ],
      };
    }
  }

  async getObjectPresignedUrl(bucket, object, expiry = 604800) {
    const url = await this.minioClient.presignedGetObject(bucket, object, expiry);
    return {
      content: [
        {
          type: 'text',
          text: `Presigned URL: ${url}\nExpires in: ${expiry} seconds`,
        },
      ],
    };
  }

  async downloadObject(bucket, object, localPath, versionId) {
    this.validatePath(localPath);
    
    const options = versionId ? { versionId } : {};
    await this.minioClient.fGetObject(bucket, object, localPath, options);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully downloaded ${object} from bucket ${bucket} to ${localPath}`,
        },
      ],
    };
  }

  async listLocalFiles(directory) {
    this.validatePath(directory);
    
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      const fileList = [];
      
      for (const file of files) {
        const filePath = path.join(directory, file.name);
        const stats = await fs.stat(filePath);
        
        fileList.push({
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          path: filePath,
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fileList, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Cannot access directory ${directory}: ${error.message}`);
    }
  }

  async listAllowedDirectories() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(this.config.allowedDirectories, null, 2),
        },
      ],
    };
  }

  // Write operations
  async createBucket(bucket, region) {
    await this.minioClient.makeBucket(bucket, region || 'us-east-1');
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created bucket: ${bucket}`,
        },
      ],
    };
  }

  async uploadObject(bucket, object, localPath, contentType) {
    this.validatePath(localPath);
    
    const metadata = contentType ? { 'Content-Type': contentType } : {};
    await this.minioClient.fPutObject(bucket, object, localPath, metadata);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully uploaded ${localPath} to ${bucket}/${object}`,
        },
      ],
    };
  }

  async textToObject(bucket, object, text, contentType = 'text/plain') {
    const buffer = Buffer.from(text, 'utf8');
    const metadata = { 'Content-Type': contentType };
    
    await this.minioClient.putObject(bucket, object, buffer, buffer.length, metadata);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created object ${bucket}/${object} from text content`,
        },
      ],
    };
  }

  async copyObject(sourceBucket, sourceObject, destBucket, destObject, versionId) {
    const conditions = new this.minioClient.CopyConditions();
    if (versionId) {
      conditions.setMatchETagExcept(versionId);
    }
    
    await this.minioClient.copyObject(destBucket, destObject, `/${sourceBucket}/${sourceObject}`, conditions);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully copied ${sourceBucket}/${sourceObject} to ${destBucket}/${destObject}`,
        },
      ],
    };
  }

  async setObjectTags(bucket, object, tags, versionId) {
    const options = versionId ? { versionId } : {};
    await this.minioClient.setObjectTagging(bucket, object, tags, options);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully set tags for ${bucket}/${object}`,
        },
      ],
    };
  }

  async setBucketTags(bucket, tags) {
    await this.minioClient.setBucketTagging(bucket, tags);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully set tags for bucket ${bucket}`,
        },
      ],
    };
  }

  async setBucketVersioning(bucket, enabled) {
    const config = enabled ? { Status: 'Enabled' } : { Status: 'Suspended' };
    await this.minioClient.setBucketVersioning(bucket, config);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully ${enabled ? 'enabled' : 'disabled'} versioning for bucket ${bucket}`,
        },
      ],
    };
  }

  // Delete operations
  async deleteObject(bucket, object, versionId) {
    const options = versionId ? { versionId } : {};
    await this.minioClient.removeObject(bucket, object, options);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted object ${bucket}/${object}${versionId ? ` (version: ${versionId})` : ''}`,
        },
      ],
    };
  }

  async deleteBucket(bucket, force = false) {
    if (force) {
      // First delete all objects in bucket
      const objects = [];
      const stream = this.minioClient.listObjects(bucket, '', true);
      
      await new Promise((resolve, reject) => {
        stream.on('data', (obj) => objects.push(obj.name));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      if (objects.length > 0) {
        await this.minioClient.removeObjects(bucket, objects);
      }
    }
    
    await this.minioClient.removeBucket(bucket);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted bucket ${bucket}${force ? ' (including all objects)' : ''}`,
        },
      ],
    };
  }

  async moveObject(sourceBucket, sourceObject, destBucket, destObject, versionId) {
    // Copy then delete
    await this.copyObject(sourceBucket, sourceObject, destBucket, destObject, versionId);
    await this.deleteObject(sourceBucket, sourceObject, versionId);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully moved ${sourceBucket}/${sourceObject} to ${destBucket}/${destObject}`,
        },
      ],
    };
  }

  // Admin operations
  async getAdminInfo() {
    try {
      const info = {
        endpoint: this.config.endpoint,
        useSSL: this.config.useSSL,
        status: 'Connected',
        features: {
          writeEnabled: this.config.allowWrite,
          deleteEnabled: this.config.allowDelete,
          adminEnabled: this.config.allowAdmin,
        },
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Cannot get admin info: ${error.message}`);
    }
  }

  async getDataUsageInfo() {
    const buckets = await this.minioClient.listBuckets();
    const usage = { buckets: [] };
    
    for (const bucket of buckets) {
      let objectCount = 0;
      let totalSize = 0;
      
      const stream = this.minioClient.listObjects(bucket.name, '', true);
      
      await new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          objectCount++;
          totalSize += obj.size || 0;
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      usage.buckets.push({
        name: bucket.name,
        objectCount,
        totalSize,
        created: bucket.creationDate,
      });
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(usage, null, 2),
        },
      ],
    };
  }

  async getBucketVersioning(bucket) {
    try {
      const config = await this.minioClient.getBucketVersioning(bucket);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Versioning not configured for bucket ${bucket}`,
          },
        ],
      };
    }
  }

  async getBucketTags(bucket) {
    try {
      const tags = await this.minioClient.getBucketTagging(bucket);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tags, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No tags found for bucket ${bucket}`,
          },
        ],
      };
    }
  }

  async getBucketLifecycle(bucket) {
    try {
      const lifecycle = await this.minioClient.getBucketLifecycle(bucket);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(lifecycle, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No lifecycle configuration found for bucket ${bucket}`,
          },
        ],
      };
    }
  }

  async getBucketReplication(bucket) {
    try {
      const replication = await this.minioClient.getBucketReplication(bucket);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(replication, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No replication configuration found for bucket ${bucket}`,
          },
        ],
      };
    }
  }

  // Utility methods
  validatePath(filePath) {
    const resolvedPath = path.resolve(filePath);
    const isAllowed = this.config.allowedDirectories.some(allowedDir => 
      resolvedPath.startsWith(path.resolve(allowedDir))
    );
    
    if (!isAllowed) {
      throw new Error(`Access denied: ${filePath} is not in allowed directories: ${this.config.allowedDirectories.join(', ')}`);
    }
    
    return resolvedPath;
  }

  async run() {
    if (process.env.HTTP_MODE === 'true' || process.argv.includes('--http')) {
      const port = process.env.PORT || 8080;
      
      // HTTP-based MCP Server implementation
      const { createServer } = await import('http');
      const { parse } = await import('url');
      
      const httpServer = createServer((req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        const url = parse(req.url, true);
        
        if (url.pathname === '/health') {
          res.writeHead(200);
          res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'aistor-mcp-server',
            version: '1.0.0',
            endpoint: this.config.endpoint,
            features: {
              writeEnabled: this.config.allowWrite,
              deleteEnabled: this.config.allowDelete,
              adminEnabled: this.config.allowAdmin
            }
          }));
          return;
        }
        
        if (url.pathname === '/mcp') {
          if (req.method === 'GET') {
            // Return server info for GET requests
            res.writeHead(200);
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              result: {
                protocolVersion: "2025-06-18",
                capabilities: {
                  tools: {}
                },
                serverInfo: {
                  name: "aistor-mcp-server",
                  version: "1.0.0"
                }
              },
              id: 1
            }));
            return;
          }
          
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', async () => {
              try {
                const request = JSON.parse(body);
                const response = await this.handleMCPRequest(request);
                res.writeHead(200);
                res.end(JSON.stringify(response));
              } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({
                  jsonrpc: "2.0",
                  error: {
                    code: -32700,
                    message: "Parse error",
                    data: error.message
                  },
                  id: null
                }));
              }
            });
            return;
          }
        }
        
        // 404 for other paths
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      });
      
      httpServer.listen(port, '0.0.0.0', () => {
        console.error(`AIStor MCP Server running on HTTP port ${port}`);
        console.error(`Health: http://0.0.0.0:${port}/health`);
        console.error(`MCP: http://0.0.0.0:${port}/mcp`);
      });
      
    } else {
      // STDIO mode for local development
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('AIStor MCP Server running on stdio');
    }
  }
  
  // HTTP MCP Request Handler
  async handleMCPRequest(request) {
    try {
      const { method, params, id } = request;
      
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: "2.0",
            result: {
              protocolVersion: "2025-06-18",
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: "aistor-mcp-server",
                version: "1.0.0"
              }
            },
            id
          };
          
        case 'initialized':
          return {
            jsonrpc: "2.0",
            result: {},
            id
          };
          
        case 'tools/list':
          const tools = await this.getToolsList();
          return {
            jsonrpc: "2.0",
            result: { tools },
            id
          };
          
        case 'tools/call':
          const result = await this.callTool(params.name, params.arguments || {});
          return {
            jsonrpc: "2.0",
            result,
            id
          };
          
        default:
          return {
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: "Method not found",
              data: `Unknown method: ${method}`
            },
            id
          };
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
          data: error.message
        },
        id: request.id || null
      };
    }
  }

  // Get tools list for HTTP mode
  async getToolsList() {
    const tools = [
      {
        name: 'list_buckets',
        description: 'List all buckets in the AIStor object store',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_bucket_contents',
        description: 'List objects in a bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'Bucket name' },
            prefix: { type: 'string', description: 'Object prefix filter' }
          },
          required: ['bucket']
        }
      },
      {
        name: 'get_object_metadata',
        description: 'Get object metadata',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'Bucket name' },
            object: { type: 'string', description: 'Object name' }
          },
          required: ['bucket', 'object']
        }
      },
      {
        name: 'get_object_presigned_url',
        description: 'Generate presigned URL for object access',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'Bucket name' },
            object: { type: 'string', description: 'Object name' },
            expiry: { type: 'number', description: 'Expiration in seconds' }
          },
          required: ['bucket', 'object']
        }
      }
    ];
    
    // Add write operations
    if (this.config.allowWrite) {
      tools.push(
        {
          name: 'create_bucket',
          description: 'Create a new bucket',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Bucket name' }
            },
            required: ['bucket']
          }
        },
        {
          name: 'text_to_object',
          description: 'Create object from text',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Bucket name' },
              object: { type: 'string', description: 'Object name' },
              text: { type: 'string', description: 'Text content' }
            },
            required: ['bucket', 'object', 'text']
          }
        }
      );
    }
    
    // Add delete operations
    if (this.config.allowDelete) {
      tools.push(
        {
          name: 'delete_object',
          description: 'Delete an object',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Bucket name' },
              object: { type: 'string', description: 'Object name' }
            },
            required: ['bucket', 'object']
          }
        },
        {
          name: 'delete_bucket',
          description: 'Delete a bucket',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'Bucket name' },
              force: { type: 'boolean', description: 'Force delete non-empty bucket' }
            },
            required: ['bucket']
          }
        }
      );
    }
    
    // Add admin operations
    if (this.config.allowAdmin) {
      tools.push(
        {
          name: 'get_admin_info',
          description: 'Get cluster admin information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_data_usage_info',
          description: 'Get storage usage statistics',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      );
    }
    
    return tools;
  }

  // Call tool for HTTP mode
  async callTool(name, args) {
    try {
      switch (name) {
        case 'list_buckets':
          return await this.listBuckets();
        case 'list_bucket_contents':
          return await this.listBucketContents(args.bucket, args.prefix);
        case 'get_object_metadata':
          return await this.getObjectMetadata(args.bucket, args.object);
        case 'get_object_presigned_url':
          return await this.getObjectPresignedUrl(args.bucket, args.object, args.expiry);
        case 'create_bucket':
          this.checkWritePermission();
          return await this.createBucket(args.bucket);
        case 'text_to_object':
          this.checkWritePermission();
          return await this.textToObject(args.bucket, args.object, args.text);
        case 'delete_object':
          this.checkDeletePermission();
          return await this.deleteObject(args.bucket, args.object);
        case 'delete_bucket':
          this.checkDeletePermission();
          return await this.deleteBucket(args.bucket, args.force);
        case 'get_admin_info':
          this.checkAdminPermission();
          return await this.getAdminInfo();
        case 'get_data_usage_info':
          this.checkAdminPermission();
          return await this.getDataUsageInfo();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ]
      };
    }
  }

  // Helper method to count available tools
  async getToolCount() {
    let count = 8; // Basic tools
    if (this.config.allowWrite) count += 7;
    if (this.config.allowDelete) count += 3;
    if (this.config.allowAdmin) count += 6;
    return count;
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--allow-write':
        config.allowWrite = true;
        break;
      case '--allow-delete':
        config.allowDelete = true;
        break;
      case '--allow-admin':
        config.allowAdmin = true;
        break;
      case '--allowed-directories':
        config.allowedDirectories = args[++i]?.split(',') || ['/tmp'];
        break;
      case '--max-keys':
        config.maxKeys = parseInt(args[++i], 10) || 1000;
        break;
      case '--http':
        config.httpMode = true;
        break;
      case '--port':
        config.port = parseInt(args[++i], 10) || 8080;
        break;
      case '--help':
        console.log(`
AIStor MCP Server - Model Context Protocol Server for MinIO/AIStor

Usage: node server.js [options]

Options:
  --allow-write              Enable write operations (create buckets, upload objects)
  --allow-delete             Enable delete operations (delete objects, buckets)
  --allow-admin              Enable admin operations (get cluster info, usage stats)
  --allowed-directories DIR  Comma-separated list of allowed local directories (default: /tmp)
  --max-keys NUM             Maximum number of objects to list (default: 1000)
  --http                     Run in HTTP mode instead of STDIO (for web deployment)
  --port NUM                 Port for HTTP mode (default: 8080)
  --help                     Show this help message

Environment Variables:
  MINIO_ENDPOINT             MinIO server endpoint (default: play.min.io)
  MINIO_ACCESS_KEY           MinIO access key
  MINIO_SECRET_KEY           MinIO secret key
  MINIO_USE_SSL              Use SSL connection (default: true)
  ALLOW_WRITE                Enable write operations (true/false)
  ALLOW_DELETE               Enable delete operations (true/false)
  ALLOW_ADMIN                Enable admin operations (true/false)
  ALLOWED_DIRECTORIES        Comma-separated allowed directories
  MAX_KEYS                   Maximum keys to return in listings
  HTTP_MODE                  Run in HTTP mode (true/false)
  PORT                       Port for HTTP mode (default: 8080)

Examples:
  # Read-only server (STDIO mode)
  node server.js

  # Full permissions (STDIO mode)
  node server.js --allow-write --allow-delete --allow-admin

  # HTTP mode for web deployment
  node server.js --http --port 3000

  # Custom directory access
  node server.js --allowed-directories /home/user/data,/tmp
        `);
        process.exit(0);
        break;
    }
  }
  
  // Override environment variables with CLI args
  Object.entries(config).forEach(([key, value]) => {
    if (key === 'allowWrite') process.env.ALLOW_WRITE = value.toString();
    if (key === 'allowDelete') process.env.ALLOW_DELETE = value.toString();
    if (key === 'allowAdmin') process.env.ALLOW_ADMIN = value.toString();
    if (key === 'allowedDirectories') process.env.ALLOWED_DIRECTORIES = value.join(',');
    if (key === 'maxKeys') process.env.MAX_KEYS = value.toString();
    if (key === 'httpMode') process.env.HTTP_MODE = value.toString();
    if (key === 'port') process.env.PORT = value.toString();
  });
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  parseArgs();
  const server = new AistorMCPServer();
  
  process.on('SIGINT', async () => {
    console.error('\nShutting down AIStor MCP Server...');
    process.exit(0);
  });
  
  server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
