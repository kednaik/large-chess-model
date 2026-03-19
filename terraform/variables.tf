variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "large-chess-model"
}

variable "ecs_task_cpu" {
  description = "CPU units for ECS task (Fargate)"
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "ecs_task_memory" {
  description = "Memory for ECS task (Fargate)"
  type        = number
  default     = 1024 # 1 GB
}
