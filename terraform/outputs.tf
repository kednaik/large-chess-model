output "alb_dns_name" {
  value       = aws_lb.api.dns_name
  description = "The DNS name of the ALB serving the backend API."
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "The domain name of the CloudFront distribution for the frontend."
}

output "frontend_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "The name of the S3 bucket hosting the frontend."
}
