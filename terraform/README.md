# Terraform Infrastructure

## Resources Created

| Resource | Description |
|----------|-------------|
| **VPC** | VPC with 3 public + 3 private subnets, NAT Gateway |
| **EKS Cluster** | Kubernetes 1.29 with managed node group (t3.medium, 2-5 nodes) |
| **RDS PostgreSQL** | PostgreSQL 16.3 (db.t3.micro), encrypted, private subnet |
| **Security Groups** | Network rules allowing EKS → RDS on port 5432 |

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5.0
- S3 bucket for state (`auto-repair-terraform-state`)

## How to Apply

```bash
cd terraform

# Initialize Terraform (downloads providers and modules)
terraform init

# Preview changes
terraform plan -var="db_password=YOUR_SECURE_PASSWORD"

# Apply infrastructure
terraform apply -var="db_password=YOUR_SECURE_PASSWORD"

# Configure kubectl
aws eks update-kubeconfig --name auto-repair-cluster --region us-east-1
```

## Deploy Application to Cluster

After cluster is provisioned:

```bash
# Apply K8s manifests
kubectl apply -f ../k8s/configmap.yaml
kubectl apply -f ../k8s/secret.yaml
kubectl apply -f ../k8s/postgres.yaml
kubectl apply -f ../k8s/api-deployment.yaml
kubectl apply -f ../k8s/api-service.yaml
kubectl apply -f ../k8s/hpa.yaml
```

## Destroy

```bash
terraform destroy -var="db_password=YOUR_SECURE_PASSWORD"
```
