resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_attr" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "s3_read_policy" {
  name = "${var.project_name}-s3-read"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = ["s3:GetObject", "s3:ListBucket"],
      Effect = "Allow",
      Resource = [
        "arn:aws:s3:::large-chess-model-weights-kednaik",
        "arn:aws:s3:::large-chess-model-weights-kednaik/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3_attr" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.s3_read_policy.arn
}
