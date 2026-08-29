import { useState, useEffect, useCallback } from 'react';
import { Doctor, DoctorMedicineRate } from '../types/doctor';
import { doctorService } from '../services/doctorService';

export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await doctorService.getDoctors();
      setDoctors(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load doctors';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const saveDoctor = async (doctorData: Partial<Doctor>) => {
    const saved = await doctorService.saveDoctor(doctorData);
    await fetchDoctors();
    return saved;
  };

  const deleteDoctor = async (id: string) => {
    await doctorService.deleteDoctor(id);
    await fetchDoctors();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await doctorService.toggleDoctorActive(id, isActive);
    await fetchDoctors();
  };

  const getDoctorRates = async (doctorId: string): Promise<DoctorMedicineRate[]> => {
    return doctorService.getDoctorRates(doctorId);
  };

  const saveDoctorRate = async (rateData: Partial<DoctorMedicineRate>) => {
    return doctorService.saveDoctorRate(rateData);
  };

  const deleteDoctorRate = async (rateId: string) => {
    return doctorService.deleteDoctorRate(rateId);
  };

  const filteredDoctors = doctors.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.doctor_name && d.doctor_name.toLowerCase().includes(q)) ||
      (d.clinic_name && d.clinic_name.toLowerCase().includes(q)) ||
      (d.area && d.area.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q))
    );
  });

  return {
    doctors: filteredDoctors,
    allDoctors: doctors,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: fetchDoctors,
    saveDoctor,
    deleteDoctor,
    toggleActive,
    getDoctorRates,
    saveDoctorRate,
    deleteDoctorRate,
  };
}
