<?php
$fp = @fopen("test.php", "r");
while (!feof($fp)) {
    echo fgets($fp, 9182) . "<br>";
}
fclose($fp);
echo 'プログラムの終わりに来ました';
?>