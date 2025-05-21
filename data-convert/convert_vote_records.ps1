#Requires -Version 5.0
<#
.SYNOPSIS
    Chuyển đổi dữ liệu từ file TSV (vote_records.tsv) sang file JSON.
.DESCRIPTION
    Script này đọc dữ liệu từ file vote_records.tsv, sau đó tạo một file JSON với cấu trúc:
    {
      "records": {
        "vote": [
          {
            "id": "Giá trị từ cột vote_id",
            "time": "Giá trị từ cột Timestamp",
            "nominee_1": "Giá trị từ cột impress_01",
            "nominee_2": "Giá trị từ cột impress_02",
            "nominee_3": "Giá trị từ cột impress_03"
          }
        ]
      }
    }
.PARAMETER TSVFilePath
    Đường dẫn đầy đủ đến file TSV đầu vào. Mặc định là 'vote_records.tsv' trong cùng thư mục.
.PARAMETER JsonFilePath
    Đường dẫn đầy đủ để lưu file JSON đầu ra. Mặc định là 'vote_records.json' trong cùng thư mục.
.EXAMPLE
    .\Convert-VoteRecordsToJson.ps1
    (Sử dụng đường dẫn mặc định cho file TSV và JSON)
.EXAMPLE
    .\Convert-VoteRecordsToJson.ps1 -TSVFilePath "C:\data\vote_data.tsv" -JsonFilePath "C:\output\records.json"
    (Chỉ định đường dẫn tùy chỉnh)
#>
param (
    [string]$TSVFilePath = (Join-Path $PSScriptRoot "vote_records.tsv"),
    [string]$JsonFilePath = (Join-Path $PSScriptRoot "vote_records.json")
)

function Convert-VoteRecordsTsvToJson {
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

        # Cập nhật danh sách cột bắt buộc
        $requiredColumns = @('vote_id', 'Timestamp', 'impress_01', 'impress_02', 'impress_03')
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

        $voteList = [System.Collections.Generic.List[PSCustomObject]]::new()
        $processedRows = 0

        if ($null -ne $tsvData) {
            foreach ($row in $tsvData) {
                $processedRows++

                # Tạo đối tượng cho mỗi lượt vote
                $voteObject = [PSCustomObject]@{
                    id        = ($row.vote_id | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.vote_id.Trim() : $row.vote_id
                    time      = ($row.Timestamp | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.Timestamp.Trim() : $row.Timestamp
                    nominee_1 = ($row.impress_01 | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.impress_01.Trim() : $row.impress_01
                    nominee_2 = ($row.impress_02 | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.impress_02.Trim() : $row.impress_02
                    nominee_3 = ($row.impress_03 | Get-Member -Name Trim -MemberType Method -ErrorAction SilentlyContinue) ? $row.impress_03.Trim() : $row.impress_03
                }
                $voteList.Add($voteObject)
            }
        }

        # Tạo cấu trúc JSON cuối cùng
        $finalJsonObject = [PSCustomObject]@{
            records = [PSCustomObject]@{
                vote = $voteList
            }
        }

        # Chuyển đổi sang JSON. -Depth 10 để đảm bảo các đối tượng lồng nhau được chuyển đổi đầy đủ.
        $jsonOutput = $finalJsonObject | ConvertTo-Json -Depth 10

        # Lưu file JSON, sử dụng UTF8 để đảm bảo tiếng Việt (nếu có trong dữ liệu)
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
    # Cập nhật file mẫu
    $sampleContent = @"
vote_id`tTimestamp`timpress_01`timpress_02`timpress_03
v001`t2023-05-20 10:00:00`tNomA`tNomB`tNomC
v002`t2023-05-20 10:05:00`tNomD`tNomA`tNomE
v003`t2023-05-20 10:10:00`tNomB`tNomF`tNomA
v004`t2023-05-20 10:15:00`tNomC`tNomG`tNomB
"@
    Set-Content -Path $TSVFilePath -Value $sampleContent -Encoding UTF8
    Write-Host "Đã tạo file mẫu '$TSVFilePath' với encoding UTF-8."
}

Convert-VoteRecordsTsvToJson -InputTsvPath $TSVFilePath -OutputJsonPath $JsonFilePath
