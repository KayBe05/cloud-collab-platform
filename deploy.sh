#!/bin/bash
echo "Deploying to AWS..."
aws s3 cp ./app s3://my-bucket --recursive
