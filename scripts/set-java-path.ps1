$p = [Environment]::GetEnvironmentVariable('Path','User')
$new = $p + ';C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\bin'
[Environment]::SetEnvironmentVariable('Path', $new, 'User')
Write-Output "User PATH updated"
