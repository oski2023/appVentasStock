import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Keyboard, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
  placeholderManual?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código QR',
  placeholderManual = 'O escribe el código/SKU manualmente...',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setCameraError(null);
    let mounted = true;

    const startScanner = async () => {
      try {
        // Pequeño retardo para asegurar que el DOM esté renderizado
        await new Promise((r) => setTimeout(r, 150));
        if (!mounted) return;

        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' }, // Cámara trasera en móviles
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Limpiar si el QR contiene URL tipo /ficha/VAR-XXXX o URL completa
            let cleanCode = decodedText.trim();
            if (cleanCode.includes('/ficha/')) {
              cleanCode = cleanCode.split('/ficha/')[1] || cleanCode;
            } else if (cleanCode.includes('/comprobante/')) {
              cleanCode = cleanCode.split('/comprobante/')[1] || cleanCode;
            }
            stopScanner();
            onScan(cleanCode);
            onClose();
          },
          () => {
            // Ignorar frames sin código
          }
        );

        if (mounted) setIsScanning(true);
      } catch (err: any) {
        console.warn('No se pudo inicializar la cámara:', err);
        if (mounted) {
          setCameraError(
            'No se pudo acceder a la cámara. Asegúrese de otorgar permisos de cámara o ingrese el código manualmente.'
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Error silencioso al detener
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      let cleanCode = manualCode.trim();
      if (cleanCode.includes('/ficha/')) {
        cleanCode = cleanCode.split('/ficha/')[1] || cleanCode;
      }
      stopScanner();
      onScan(cleanCode);
      setManualCode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-brand-600" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visor de Cámara */}
        <div className="p-4">
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-black">
            <div
              id={scannerContainerId}
              className="w-full min-h-[260px] flex items-center justify-center text-white"
            />
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-4 text-center text-white">
                <AlertCircle className="mb-2 h-8 w-8 text-amber-400" />
                <p className="text-xs text-gray-200">{cameraError}</p>
              </div>
            )}
          </div>

          <p className="mt-2 text-center text-xs text-gray-500">
            Apunta la cámara de tu celular o tablet hacia el código QR de la etiqueta
          </p>

          {/* Ingreso Manual de Respaldo (RF-03) */}
          <form onSubmit={handleManualSubmit} className="mt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={placeholderManual}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"
                />
                <Keyboard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
