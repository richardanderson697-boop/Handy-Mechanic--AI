'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

interface VinScannerProps {
  onVehicleDecoded: (vehicleInfo: any) => void;
}

export function VinScanner({ onVehicleDecoded }: VinScannerProps) {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);

  const validateVin = (vinCode: string): boolean => {
    // VIN must be 17 characters
    if (vinCode.length !== 17) return false;
    
    // VIN cannot contain I, O, or Q
    if (/[IOQ]/.test(vinCode.toUpperCase())) return false;
    
    return true;
  };

  const handleDecode = async () => {
    setError(null);
    
    const vinUpper = vin.toUpperCase().trim();
    
    if (!validateVin(vinUpper)) {
      setError('Invalid VIN format. VIN must be exactly 17 characters and cannot contain I, O, or Q.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.decodeVin(vinUpper);
      
      if (response.success) {
        setVehicleData(response.vehicle);
        onVehicleDecoded(response.vehicle);
      } else {
        setError(response.error || 'Failed to decode VIN');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to decode VIN');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setVin(value);
    setError(null);
    setVehicleData(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={vin}
          onChange={handleInputChange}
          placeholder="Enter 17-digit VIN"
          maxLength={17}
          className="font-mono text-lg"
          disabled={loading}
        />
        <Button
          onClick={handleDecode}
          disabled={loading || vin.length !== 17}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Decode
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        {vin.length}/17 characters
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {vehicleData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle className="h-5 w-5" />
            Vehicle Decoded Successfully
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Year</div>
              <div className="font-medium">{vehicleData.year}</div>
            </div>
            <div>
              <div className="text-gray-500">Make</div>
              <div className="font-medium">{vehicleData.make}</div>
            </div>
            <div>
              <div className="text-gray-500">Model</div>
              <div className="font-medium">{vehicleData.model}</div>
            </div>
            <div>
              <div className="text-gray-500">Trim</div>
              <div className="font-medium">{vehicleData.trim || 'N/A'}</div>
            </div>
            {vehicleData.engine && (
              <div className="col-span-2">
                <div className="text-gray-500">Engine</div>
                <div className="font-medium">{vehicleData.engine}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
