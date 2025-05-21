#Requires -Version 5.0
<#
.SYNOPSIS
    Chuyển đổi dữ liệu từ file TSV (Tab-Separated Values) sang file JSON.
.DESCRIPTION
    Script này đọc dữ liệu từ một file TSV, sau đó tạo một file JSON với cấu trúc:
    {
      "lucky_number": { // THAY ĐỔI KEY GỐC
        "nominee": [
          {
            "lucky_number": "...", // THAY ĐỔI TRƯỜNG NÀY
            "name": "...",
            "department": "...",
            "about": "...",
            "thumbnail": "thumb/..."
          }
        ]
      }
    }
.PARAMETER TSVFilePath
    Đường dẫn đầy đủ đến file TSV đầu vào. Mặc định là 'data.tsv' trong cùng thư mục.
.PARAMETER JsonFilePath
    Đường dẫn đầy đủ để lưu file JSON đầu ra. Mặc định là 'lucky_number.json' trong cùng thư mục.    
.EXAMPLE
    .\Convert-TsvToJson.ps1
    (Sử dụng đường dẫn mặc định cho file TSV và JSON)
.EXAMPLE
    .\Convert-TsvToJson.ps1 -TSVFilePath "C:\data\input_data.tsv" -JsonFilePath "C:\output\lucky_data.json"
    (Chỉ định đường dẫn tùy chỉnh)
#>
param (
    [string]$TSVFilePath = (Join-Path $PSScriptRoot "data.tsv"),
    # Cân nhắc đổi tên file output mặc định nếu cần, ví dụ:
    # [string]$JsonFilePath = (Join-Path $PSScriptRoot "lucky_numbers.json")
    [string]$JsonFilePath = (Join-Path $PSScriptRoot "lucky_number.json")
)

function Convert-TsvToVotingJson {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true, ValueFromPipelineByPropertyName=$true)]
        [string]$InputTsvPath,

        [Parameter(Mandatory=$true, ValueFromPipelineByPropertyName=$true)]
        [string]$OutputJsonPath
    )

    try {
        # Kiểm tra file TSV đầu vào
        if (-not (Test-Path -Path $InputTsvPath -PathType Leaf)) {
            Write-Error "Lỗi: Không tìm thấy file TSV tại '$InputTsvPath'. Vui lòng kiểm tra lại đường dẫn."
            return
        }
        if ((Get-Item $InputTsvPath).Length -eq 0) {
            Write-Error "Lỗi: File TSV '$InputTsvPath' trống."
            return
        }

        # Đọc dòng tiêu đề từ file TSV để xác định và kiểm tra các cột
        Write-Host "Đang đọc dòng tiêu đề từ file TSV: $InputTsvPath"
        $headerLine = Get-Content -Path $InputTsvPath -TotalCount 1 -Encoding UTF8
        if ([string]::IsNullOrWhiteSpace($headerLine)) {
            Write-Error "Lỗi: File TSV '$InputTsvPath' trống hoặc không có dòng tiêu đề hợp lệ."
            return
        }
        # Tách và làm sạch tên các cột từ dòng tiêu đề
        $actualHeaders = $headerLine -split "`t" | ForEach-Object { $_.Trim() }

        # THAY ĐỔI: Cập nhật danh sách cột bắt buộc
        $requiredColumns = @('lucky_number', 'name', 'loc', 'self_introduction', 'image')
        $missingColumns = $requiredColumns | Where-Object { $actualHeaders -notcontains $_ }
        if ($missingColumns.Count -gt 0) {
            Write-Error "Lỗi: File TSV '$InputTsvPath' thiếu các cột bắt buộc sau: $($missingColumns -join ', ')."
            Write-Error "Các cột hiện có là: $($actualHeaders -join ', ')"
            return
        }

        # Đọc dữ liệu TSV (bỏ qua dòng tiêu đề đã đọc) sử dụng header đã xác định và làm sạch
        Write-Host "Đang đọc dữ liệu từ file TSV: $InputTsvPath (sử dụng header đã được xác định)"
        $tsvData = Get-Content -Path $InputTsvPath -Encoding UTF8 |
                   Select-Object -Skip 1 |
                   ConvertFrom-Csv -Delimiter "`t" -Header $actualHeaders

        if ($null -eq $tsvData -or $tsvData.Count -eq 0) {
            Write-Warning "Thông báo: File TSV '$InputTsvPath' không có dòng dữ liệu nào sau dòng tiêu đề."
        }

        $nomineesList = [System.Collections.Generic.List[PSCustomObject]]::new()
        $processedRows = 0

        if ($null -ne $tsvData) {
            foreach ($row in $tsvData) {
                $processedRows++
                $imageName = ($row.image | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.image.Trim() : $row.image
                $thumbnailPath = if (-not [string]::IsNullOrWhiteSpace($imageName)) { "thumb/$imageName" } else { "thumb/" }

                # THAY ĐỔI: Cập nhật tên trường và nguồn dữ liệu
                $nomineeObject = [PSCustomObject]@{
                    lucky_number      = ($row.lucky_number | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.lucky_number.Trim() : $row.lucky_number # Lấy từ cột 'lucky_number'
                    name              = ($row.name | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.name.Trim() : $row.name
                    department        = ($row.loc | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.loc.Trim() : $row.loc # Nguồn từ cột 'loc'
                    about             = ($row.self_introduction | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.self_introduction.Trim() : $row.self_introduction # Nguồn từ cột 'self_introduction'
                    thumbnail         = $thumbnailPath
                }
                $nomineesList.Add($nomineeObject)
            }
        }

        # THAY ĐỔI: Cập nhật cấu trúc JSON cuối cùng
        $finalJsonObject = [PSCustomObject]@{
            lucky_number = [PSCustomObject]@{ # Key gốc mới
                nominee = $nomineesList
            }
        }

        # Chuyển đổi sang JSON. -Depth 10 để đảm bảo các đối tượng lồng nhau được chuyển đổi đầy đủ.
        $jsonOutput = $finalJsonObject | ConvertTo-Json -Depth 10

        # Lưu file JSON, sử dụng UTF8 để đảm bảo tiếng Việt
        Set-Content -Path $OutputJsonPath -Value $jsonOutput -Encoding UTF8

        Write-Host "Đã chuyển đổi thành công! File JSON được lưu tại: $OutputJsonPath"
        if ($processedRows -gt 0) {
            Write-Host "Đã xử lý $processedRows dòng dữ liệu."
        } elseif (($null -eq $tsvData -or $tsvData.Count -eq 0) -and $processedRows -eq 0) {
             Write-Host "Thông báo: File TSV '$InputTsvPath' không có dòng dữ liệu nào để xử lý (chỉ có thể có tiêu đề)."
        }


    } catch {
        Write-Error "Đã xảy ra lỗi trong quá trình chuyển đổi:"
        Write-Error $_.Exception.Message
        Write-Error $_.ScriptStackTrace
    }
}

# --- Phần thực thi script ---
if (-not (Test-Path -Path $TSVFilePath -PathType Leaf)) {
    Write-Host "Thông báo: File '$TSVFilePath' không tồn tại. Tạo file mẫu..."
    # THAY ĐỔI: Cập nhật file mẫu để có cột 'lucky_number'
    $sampleContent = @"
lucky_number`tname`tloc`tself_introduction`timage
7`tNguyễn Văn A`tPhòng Kỹ Thuật`tỨng cử viên A với nhiều năm kinh nghiệm.`tanh_a.jpg
23`tTrần Thị B`tPhòng Nhân Sự`tỨng cử viên B năng động, sáng tạo.`tanh_b.png
101`tLê Văn C`tPhòng Marketing`tỨng cử viên C đầy nhiệt huyết.`t
88`tPhạm Thị D`tPhòng Kinh Doanh`tỨng cử viên D.`t    anh_d.gif    
"@
    Set-Content -Path $TSVFilePath -Value $sampleContent -Encoding UTF8
    Write-Host "Đã tạo file mẫu '$TSVFilePath' với encoding UTF-8 và cột 'lucky_number'."
}

Convert-TsvToVotingJson -InputTsvPath $TSVFilePath -OutputJsonPath $JsonFilePath
