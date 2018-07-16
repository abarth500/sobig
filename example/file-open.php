<?php
$fp = @fopen("package.json", "r");
while (!feof($fp)) {
    echo fgets($fp, 9182) . "<br>";
}
fclose($fp);
echo 'プログラムの終わりに来ました';
?>