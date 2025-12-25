# AWS Lambda Deploy Script for testapp
# PowerShell Script

$ErrorActionPreference = "Stop"
$AWS_CLI = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$REGION = "ap-northeast-1"
$FUNCTION_NAME = "testapp-api"
$ROLE_ARN = "arn:aws:iam::818604466217:role/testapp-lambda-role"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Deploying Lambda function: $FUNCTION_NAME" -ForegroundColor Green

# Check if function exists
$functionExists = $false
try {
    & $AWS_CLI lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>$null | Out-Null
    $functionExists = $true
    Write-Host "Function exists, updating..." -ForegroundColor Yellow
} catch {
    Write-Host "Function does not exist, creating..." -ForegroundColor Yellow
}

if ($functionExists) {
    # Update function code
    & $AWS_CLI lambda update-function-code `
        --function-name $FUNCTION_NAME `
        --zip-file "fileb://$SCRIPT_DIR/lambda/function.zip" `
        --region $REGION
    Write-Host "Function code updated!" -ForegroundColor Green
} else {
    # Create new function
    & $AWS_CLI lambda create-function `
        --function-name $FUNCTION_NAME `
        --runtime nodejs20.x `
        --handler dist/index.handler `
        --role $ROLE_ARN `
        --zip-file "fileb://$SCRIPT_DIR/lambda/function.zip" `
        --timeout 30 `
        --memory-size 256 `
        --environment "Variables={USERS_TABLE=testapp-users,PROJECTS_TABLE=testapp-projects,SIGNBOARDS_TABLE=testapp-signboards,PHOTOS_TABLE=testapp-photos,UPLOADS_BUCKET=testapp-uploads-818604466217}" `
        --region $REGION
    Write-Host "Function created!" -ForegroundColor Green

    # Wait for function to be active
    Write-Host "Waiting for function to be active..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Create Function URL
    Write-Host "Creating Function URL..." -ForegroundColor Yellow
    & $AWS_CLI lambda create-function-url-config `
        --function-name $FUNCTION_NAME `
        --auth-type NONE `
        --cors "AllowOrigins=*,AllowMethods=*,AllowHeaders=*" `
        --region $REGION

    # Add permission for public access
    & $AWS_CLI lambda add-permission `
        --function-name $FUNCTION_NAME `
        --statement-id FunctionURLAllowPublicAccess `
        --action lambda:InvokeFunctionUrl `
        --principal "*" `
        --function-url-auth-type NONE `
        --region $REGION
}

# Get Function URL
$urlConfig = & $AWS_CLI lambda get-function-url-config --function-name $FUNCTION_NAME --region $REGION | ConvertFrom-Json
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Function URL: $($urlConfig.FunctionUrl)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
