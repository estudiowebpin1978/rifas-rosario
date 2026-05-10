$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2NjdW9ncnZvaHpjbG90aGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNzk2NTEsImV4cCI6MjA5Mzk1NTY1MX0.8571SQnYie1LgRNRdftK4dGowPqBMopsIkelvvpQS0k"
    "Content-Type" = "application/json"
}

$body = @{
    "email" = "georchina348@gmail.com"
    "password" = "kiarateamo"
    "email_confirm" = $true
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://egwccuogrvohzclothft.supabase.co/auth/v1/signup" -Method POST -Headers $headers -Body $body
$response | ConvertTo-Json