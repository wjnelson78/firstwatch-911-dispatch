/**
 * Incident Report Component
 * 
 * Official incident intake form for community members to submit
 * detailed reports similar to police reports.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileWarning, 
  MapPin, 
  User, 
  Car,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || '';

const INCIDENT_TYPES = [
  'Theft/Burglary',
  'Vandalism',
  'Suspicious Activity',
  'Traffic Incident',
  'Noise Complaint',
  'Animal Related',
  'Harassment',
  'Assault',
  'Drug Activity',
  'Domestic Disturbance',
  'Missing Person',
  'Found Property',
  'Lost Property',
  'Fraud/Scam',
  'Trespassing',
  'Other'
];

interface IncidentFormData {
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  incidentType: string;
  incidentDate: string;
  incidentTime: string;
  locationAddress: string;
  locationCity: string;
  locationZip: string;
  description: string;
  personsInvolved: string;
  vehiclesInvolved: string;
  injuriesReported: boolean;
  injuryDetails: string;
  witnessInfo: string;
}

const initialFormData: IncidentFormData = {
  reporterName: '',
  reporterPhone: '',
  reporterEmail: '',
  incidentType: '',
  incidentDate: '',
  incidentTime: '',
  locationAddress: '',
  locationCity: '',
  locationZip: '',
  description: '',
  personsInvolved: '',
  vehiclesInvolved: '',
  injuriesReported: false,
  injuryDetails: '',
  witnessInfo: ''
};

export function IncidentReport() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<IncidentFormData>({
    ...initialFormData,
    reporterName: user ? `${user.firstName} ${user.lastName}` : '',
    reporterEmail: user?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [incidentNumber, setIncidentNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const updateField = (field: keyof IncidentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Combine date and time
      const incidentDateTime = formData.incidentDate && formData.incidentTime
        ? `${formData.incidentDate}T${formData.incidentTime}`
        : formData.incidentDate || new Date().toISOString();

      const response = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          incidentDate: incidentDateTime
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      const data = await response.json();
      setIncidentNumber(data.incidentNumber);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Error submitting incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      reporterName: user ? `${user.firstName} ${user.lastName}` : '',
      reporterEmail: user?.email || ''
    });
    setSubmitSuccess(false);
    setIncidentNumber(null);
    setStep(1);
  };

  // Success screen
  if (submitSuccess && incidentNumber) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Report Submitted Successfully</h2>
          <p className="text-slate-400 mb-6">
            Your incident report has been received and assigned a reference number.
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-500 mb-1">Incident Reference Number</p>
            <p className="text-2xl font-mono font-bold text-purple-400">{incidentNumber}</p>
          </div>
          
          <p className="text-sm text-slate-500 mb-6">
            Please save this number for your records. You may be contacted for additional information.
          </p>
          
          <Button onClick={resetForm} className="bg-purple-500 hover:bg-purple-600">
            Submit Another Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur max-w-3xl mx-auto">
      <CardHeader className="border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <FileWarning className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Report an Incident</CardTitle>
            <CardDescription className="text-slate-400">
              Submit a detailed incident report to local authorities
            </CardDescription>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(s)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s 
                    ? "bg-purple-500 text-white" 
                    : step > s 
                      ? "bg-green-500/20 text-green-400"
                      : "bg-slate-700 text-slate-400"
                )}
              >
                {step > s ? '✓' : s}
              </button>
              {s < 3 && (
                <div className={cn(
                  "w-16 h-0.5 mx-2",
                  step > s ? "bg-green-500/50" : "bg-slate-700"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 mt-2 text-xs text-slate-500">
          <span className={step >= 1 ? "text-white" : ""}>Contact Info</span>
          <span className={step >= 2 ? "text-white" : ""}>Incident Details</span>
          <span className={step >= 3 ? "text-white" : ""}>Additional Info</span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Contact Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-400" />
                Your Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
                  <Input
                    value={formData.reporterName}
                    onChange={(e) => updateField('reporterName', e.target.value)}
                    placeholder="Your full name"
                    required
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number *</label>
                  <Input
                    value={formData.reporterPhone}
                    onChange={(e) => updateField('reporterPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    type="tel"
                    required
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address *</label>
                <Input
                  value={formData.reporterEmail}
                  onChange={(e) => updateField('reporterEmail', e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  required
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              
              <p className="text-xs text-slate-500">
                * Your contact information will only be shared with responding agencies
              </p>
            </div>
          )}

          {/* Step 2: Incident Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Incident Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Incident Type *</label>
                  <Select
                    value={formData.incidentType}
                    onValueChange={(value) => updateField('incidentType', value)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {INCIDENT_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="text-white hover:bg-slate-800">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
                    <Input
                      type="date"
                      value={formData.incidentDate}
                      onChange={(e) => updateField('incidentDate', e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Time</label>
                    <Input
                      type="time"
                      value={formData.incidentTime}
                      onChange={(e) => updateField('incidentTime', e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-700" />
              
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location of Incident
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Street Address *</label>
                <Input
                  value={formData.locationAddress}
                  onChange={(e) => updateField('locationAddress', e.target.value)}
                  placeholder="123 Main St or Cross streets"
                  required
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">City</label>
                  <Input
                    value={formData.locationCity}
                    onChange={(e) => updateField('locationCity', e.target.value)}
                    placeholder="City"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">ZIP Code</label>
                  <Input
                    value={formData.locationZip}
                    onChange={(e) => updateField('locationZip', e.target.value)}
                    placeholder="98XXX"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>

              <Separator className="bg-slate-700" />
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description of Incident *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Please provide a detailed description of what happened..."
                  required
                  rows={5}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
          )}

          {/* Step 3: Additional Information */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Additional Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Persons Involved
                </label>
                <textarea
                  value={formData.personsInvolved}
                  onChange={(e) => updateField('personsInvolved', e.target.value)}
                  placeholder="Physical descriptions, clothing, names if known..."
                  rows={3}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicles Involved
                </label>
                <textarea
                  value={formData.vehiclesInvolved}
                  onChange={(e) => updateField('vehiclesInvolved', e.target.value)}
                  placeholder="Make, model, color, license plate if known..."
                  rows={2}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <Separator className="bg-slate-700" />
              
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.injuriesReported}
                    onChange={(e) => updateField('injuriesReported', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-slate-300">Were there any injuries?</span>
                </label>
              </div>
              
              {formData.injuriesReported && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Injury Details
                  </label>
                  <textarea
                    value={formData.injuryDetails}
                    onChange={(e) => updateField('injuryDetails', e.target.value)}
                    placeholder="Describe injuries and if medical attention was received..."
                    rows={2}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Witness Information
                </label>
                <textarea
                  value={formData.witnessInfo}
                  onChange={(e) => updateField('witnessInfo', e.target.value)}
                  placeholder="Names and contact information of any witnesses..."
                  rows={2}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <Separator className="bg-slate-700" />
              
              <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
                <p className="font-medium text-slate-300 mb-2">Important Notice</p>
                <p>
                  By submitting this report, you confirm that the information provided is true 
                  and accurate to the best of your knowledge. False reports may be subject to 
                  legal consequences. This report will be reviewed and may be forwarded to 
                  appropriate law enforcement or emergency services.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="bg-purple-500 hover:bg-purple-600"
                disabled={
                  (step === 1 && (!formData.reporterName || !formData.reporterPhone || !formData.reporterEmail)) ||
                  (step === 2 && (!formData.incidentType || !formData.incidentDate || !formData.locationAddress || !formData.description))
                }
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default IncidentReport;
