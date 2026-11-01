<?php
declare(strict_types=1);

namespace Engine;

// Datos de entrada inválidos: el backend los recibe como 422 (ErrorConstruccion).
final class ErrorDatos extends \RuntimeException
{
}
