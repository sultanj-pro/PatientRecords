// MinIO provider for Spark options (S3A)
function getOptions() {
  const endpoint = process.env.MINIO_ENDPOINT || 'http://minio:9000';
  const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
  const secretKey = process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

  return {
    'spark.hadoop.fs.s3a.endpoint': endpoint,
    'spark.hadoop.fs.s3a.access.key': accessKey,
    'spark.hadoop.fs.s3a.secret.key': secretKey,
    'spark.hadoop.fs.s3a.path.style.access': 'true',
    'spark.hadoop.fs.s3a.connection.ssl.enabled': 'false',
    'spark.hadoop.fs.s3a.impl': 'org.apache.hadoop.fs.s3a.S3AFileSystem'
  };
}

module.exports = { getOptions };
