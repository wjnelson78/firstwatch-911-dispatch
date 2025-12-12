/**
 * Enhanced Incident Report Component
 * 
 * Comprehensive incident intake form with:
 * - Agency selection with all Snohomish County agencies
 * - Severity and urgency levels
 * - Property damage assessment
 * - Environmental conditions (weather, lighting, road)
 * - Expanded incident categories
 * - Anonymous reporting option
 */

import { useState, useRef, useEffect } from 'react';
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
  Loader2,
  Upload,
  Image,
  Video,
  Mic,
  X,
  Save,
  RefreshCw,
  Shield,
  Flame,
  ThumbsUp,
  AlertOctagon,
  Building2,
  Gauge,
  Clock,
  DollarSign,
  CloudRain,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Ambulance
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DispatchEvent } from '@/types/dispatch';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Expanded categorized incident types
const INCIDENT_CATEGORIES = {
  'Property Crimes': [
    'Theft/Larceny',
    'Burglary/Break-in',
    'Motor Vehicle Theft',
    'Vandalism/Criminal Mischief',
    'Arson',
    'Trespassing',
    'Shoplifting',
    'Identity Theft',
    'Fraud/Scam',
    'Found Property',
    'Lost Property'
  ],
  'Violent Crimes': [
    'Assault',
    'Robbery',
    'Domestic Violence',
    'Harassment/Stalking',
    'Threats/Intimidation',
    'Weapons Offense'
  ],
  'Traffic Related': [
    'Traffic Accident - Property Damage',
    'Traffic Accident - Injury',
    'Hit and Run',
    'Reckless/Dangerous Driving',
    'DUI/Impaired Driver',
    'Road Hazard',
    'Parking Violation',
    'Street Racing'
  ],
  'Public Safety': [
    'Suspicious Person',
    'Suspicious Vehicle',
    'Suspicious Activity',
    'Drug Activity',
    'Public Intoxication',
    'Disturbance/Fight',
    'Noise Complaint',
    'Fireworks Violation',
    'Prowler'
  ],
  'Emergency/Rescue': [
    'Missing Person',
    'Medical Emergency',
    'Mental Health Crisis',
    'Welfare Check Request',
    'Child Endangerment',
    'Elder Abuse'
  ],
  'Animal Related': [
    'Animal Bite',
    'Dangerous Animal',
    'Animal Neglect/Abuse',
    'Stray Animal',
    'Wildlife Issue'
  ],
  'Police Related': [
    'Police Misconduct',
    'Excessive Force',
    'Wrongful Arrest',
    'Police Appreciation/Commendation'
  ],
  'Fire/EMS Related': [
    'Fire Department Misconduct',
    'EMS Misconduct',
    'Fire/EMS Appreciation/Commendation'
  ],
  'Other': [
    'Civil Dispute',
    'Neighbor Dispute',
    'Code Violation',
    'Other'
  ]
};

// Severity levels with descriptions
const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'text-green-400', description: 'No injuries, minimal impact' },
  { value: 'moderate', label: 'Moderate', color: 'text-yellow-400', description: 'Minor injuries or significant property damage' },
  { value: 'major', label: 'Major', color: 'text-orange-400', description: 'Serious injuries or major impact' },
  { value: 'critical', label: 'Critical', color: 'text-red-400', description: 'Life-threatening or catastrophic' }
];

// Urgency levels
const URGENCY_LEVELS = [
  { value: 'routine', label: 'Routine', description: 'No immediate action needed' },
  { value: 'soon', label: 'Soon', description: 'Needs attention within hours' },
  { value: 'immediate', label: 'Immediate', description: 'Requires immediate response' }
];

// Environmental conditions
const WEATHER_CONDITIONS = ['Clear', 'Cloudy', 'Partly Cloudy', 'Rain', 'Heavy Rain', 'Snow', 'Fog', 'Windy', 'Other'];
const LIGHTING_CONDITIONS = ['Daylight', 'Dawn/Dusk', 'Dark - Lit Area', 'Dark - Unlit Area'];
const ROAD_CONDITIONS = ['Dry', 'Wet', 'Icy', 'Snow-covered', 'Flooded', 'Construction', 'Other'];

// Generate a random incident ID
function generateIncidentId(): string {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${datePrefix}-${randomPart}`;
}

interface UploadedFile {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio';
  preview?: string;
}

interface Agency {
  name: string;
  type: string;
}

interface IncidentFormData {
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  isAnonymous: boolean;
  incidentType: string;
  incidentDate: string;
  incidentTime: string;
  locationAddress: string;
  locationCity: string;
  locationZip: string;
  targetAgency: string;
  agencyType: string;
  severity: string;
  urgency: string;
  description: string;
  personsInvolved: string;
  vehiclesInvolved: string;
  injuriesReported: boolean;
  injuryDetails: string;
  propertyDamage: boolean;
  damageDescription: string;
  estimatedDamageValue: string;
  weatherConditions: string;
  lightingConditions: string;
  roadConditions: string;
  witnessInfo: string;
  linkedDispatchEventId: string;
}

const initialFormData: IncidentFormData = {
  reporterName: '',
  reporterPhone: '',
  reporterEmail: '',
  isAnonymous: false,
  incidentType: '',
  incidentDate: '',
  incidentTime: '',
  locationAddress: '',
  locationCity: '',
  locationZip: '',
  targetAgency: '',
  agencyType: '',
  severity: 'moderate',
  urgency: 'routine',
  description: '',
  personsInvolved: '',
  vehiclesInvolved: '',
  injuriesReported: false,
  injuryDetails: '',
  propertyDamage: false,
  damageDescription: '',
  estimatedDamageValue: '',
  weatherConditions: '',
  lightingConditions: '',
  roadConditions: '',
  witnessInfo: '',
  linkedDispatchEventId: ''
};

interface IncidentReportProps {
  prefilledEvent?: DispatchEvent | null;
  onEventHandled?: () => void;
}

export function IncidentReport({ prefilledEvent, onEventHandled }: IncidentReportProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<IncidentFormData>({
    ...initialFormData,
    reporterName: user ? `${user.firstName} ${user.lastName}` : '',
    reporterEmail: user?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [incidentNumber, setIncidentNumber] = useState<string>(() => generateIncidentId());
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agenciesGrouped, setAgenciesGrouped] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`${API_BASE}/agencies`)
      .then(res => res.json())
      .then(data => {
        setAgencies(data.agencies || []);
        setAgenciesGrouped(data.grouped || {});
      })
      .catch(err => console.error('Failed to fetch agencies:', err));
  }, []);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      reporterName: user ? `${user.firstName} ${user.lastName}` : prev.reporterName,
      reporterEmail: user?.email || prev.reporterEmail
    }));
  }, [user]);

  useEffect(() => {
    if (prefilledEvent) {
      const eventDate = new Date(prefilledEvent.call_created);
      setFormData(prev => ({
        ...prev,
        incidentType: mapCallTypeToIncidentType(prefilledEvent.call_type),
        incidentDate: eventDate.toISOString().split('T')[0],
        incidentTime: eventDate.toTimeString().slice(0, 5),
        locationAddress: prefilledEvent.address,
        locationCity: prefilledEvent.jurisdiction,
        targetAgency: prefilledEvent.jurisdiction,
        agencyType: prefilledEvent.agency_type,
        linkedDispatchEventId: prefilledEvent.event_id,
        description: `Linked to dispatch call: ${prefilledEvent.call_type}\n\nCall Number: ${prefilledEvent.call_number}\nAgency: ${prefilledEvent.agency_type}${prefilledEvent.units ? `\nUnits: ${prefilledEvent.units}` : ''}\n\n`
      }));
      onEventHandled?.();
    }
  }, [prefilledEvent, onEventHandled]);

  function mapCallTypeToIncidentType(callType: string): string {
    const lowerType = callType.toLowerCase();
    if (lowerType.includes('theft') || lowerType.includes('burglary') || lowerType.includes('robbery')) return 'Theft/Larceny';
    if (lowerType.includes('vandal')) return 'Vandalism/Criminal Mischief';
    if (lowerType.includes('suspicious')) return 'Suspicious Activity';
    if (lowerType.includes('traffic') || lowerType.includes('accident') || lowerType.includes('collision')) return 'Traffic Accident - Property Damage';
    if (lowerType.includes('noise')) return 'Noise Complaint';
    if (lowerType.includes('animal') || lowerType.includes('dog') || lowerType.includes('cat')) return 'Stray Animal';
    if (lowerType.includes('assault')) return 'Assault';
    if (lowerType.includes('domestic')) return 'Domestic Violence';
    if (lowerType.includes('missing')) return 'Missing Person';
    if (lowerType.includes('trespass')) return 'Trespassing';
    if (lowerType.includes('medical') || lowerType.includes('aid')) return 'Medical Emergency';
    return 'Other';
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles: UploadedFile[] = [];
    Array.from(files).forEach(file => {
      let type: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined
      };
      newFiles.push(uploadedFile);
    });
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const updateField = (field: keyof IncidentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAgencySelect = (agencyName: string) => {
    const agency = agencies.find(a => a.name === agencyName);
    setFormData(prev => ({
      ...prev,
      targetAgency: agencyName,
      agencyType: agency?.type || 'Other'
    }));
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

      const incidentDateTime = formData.incidentDate && formData.incidentTime
        ? `${formData.incidentDate}T${formData.incidentTime}`
        : formData.incidentDate || new Date().toISOString();

      const response = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          incidentDate: incidentDateTime,
          estimatedDamageValue: formData.estimatedDamageValue ? parseFloat(formData.estimatedDamageValue) : null
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
    setIncidentNumber(generateIncidentId());
    setUploadedFiles([]);
    setStep(1);
  };

  const isTrafficRelated = formData.incidentType.toLowerCase().includes('traffic') || 
                          formData.incidentType.toLowerCase().includes('accident') ||
                          formData.incidentType.toLowerCase().includes('hit and run') ||
                          formData.incidentType.toLowerCase().includes('driving');

  if (submitSuccess) {
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
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur max-w-4xl mx-auto">
      <CardHeader className="border-b border-slate-700">
        <div className="flex items-center justify-between">
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
          
          <div className="bg-slate-800/70 rounded-lg px-4 py-2 text-right">
            <p className="text-xs text-slate-500 mb-0.5">Incident ID</p>
            <p className="text-lg font-mono font-bold text-purple-400">{incidentNumber}</p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!user}
            className={cn(
              "border-slate-700 text-slate-400",
              !user && "opacity-50 cursor-not-allowed"
            )}
          >
            <Save className="h-4 w-4 mr-2" />
            Save & Finish Later
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!user}
            className={cn(
              "border-slate-700 text-slate-400",
              !user && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Incident
          </Button>
        </div>
        {!user && (
          <p className="text-xs text-slate-500 mt-2">
            Create an account for the ability to Save and Finish Later or Update incident
          </p>
        )}
        
        <div className="flex items-center justify-center gap-2 mt-6">
          {[1, 2, 3, 4, 5].map((s) => (
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
              {s < 5 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  step > s ? "bg-green-500/50" : "bg-slate-700"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
          <span className={step >= 1 ? "text-white" : ""}>Contact</span>
          <span className={step >= 2 ? "text-white" : ""}>Details</span>
          <span className={step >= 3 ? "text-white" : ""}>Assessment</span>
          <span className={step >= 4 ? "text-white" : ""}>Additional</span>
          <span className={step >= 5 ? "text-white" : ""}>Evidence</span>
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
              
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAnonymous}
                    onChange={(e) => updateField('isAnonymous', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    {formData.isAnonymous ? (
                      <EyeOff className="h-5 w-5 text-purple-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-white">Submit Anonymously</span>
                  </div>
                </label>
                <p className="text-xs text-slate-500 mt-2 ml-8">
                  Your contact information will not be stored. Note: Anonymous reports may receive less follow-up.
                </p>
              </div>
              
              {!formData.isAnonymous && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
                      <Input
                        value={formData.reporterName}
                        onChange={(e) => updateField('reporterName', e.target.value)}
                        placeholder="Your full name"
                        required={!formData.isAnonymous}
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
                        required={!formData.isAnonymous}
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
                      required={!formData.isAnonymous}
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    * Your contact information will only be shared with responding agencies
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Incident Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Incident Details
              </h3>
              
              <div className="bg-slate-800/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  Agency This Report Is For
                </h4>
                <Select
                  value={formData.targetAgency}
                  onValueChange={handleAgencySelect}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                    <SelectValue placeholder="Select agency..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 max-h-80">
                    {Object.entries(agenciesGrouped).map(([type, agencyList]) => (
                      agencyList.length > 0 && (
                        <div key={type}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-800/50 flex items-center gap-2">
                            {type === 'Police' && <Shield className="h-3 w-3 text-blue-400" />}
                            {type === 'Fire' && <Flame className="h-3 w-3 text-red-400" />}
                            {type === 'EMS' && <Ambulance className="h-3 w-3 text-green-400" />}
                            {type}
                          </div>
                          {agencyList.map((agency: string) => (
                            <SelectItem 
                              key={agency} 
                              value={agency}
                              className="text-white hover:bg-slate-800"
                            >
                              {agency}
                            </SelectItem>
                          ))}
                        </div>
                      )
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-80">
                      {Object.entries(INCIDENT_CATEGORIES).map(([category, types]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-800/50 flex items-center gap-2">
                            {category === 'Police Related' && <Shield className="h-3 w-3 text-blue-400" />}
                            {category === 'Fire/EMS Related' && <Flame className="h-3 w-3 text-red-400" />}
                            {category === 'Property Crimes' && <AlertOctagon className="h-3 w-3 text-orange-400" />}
                            {category === 'Traffic Related' && <Car className="h-3 w-3 text-yellow-400" />}
                            {category}
                          </div>
                          {types.map(type => (
                            <SelectItem 
                              key={type} 
                              value={type} 
                              className={cn(
                                "text-white hover:bg-slate-800 pl-6",
                                type.includes('Appreciation') && "text-green-400",
                                type.includes('Misconduct') && "text-red-400"
                              )}
                            >
                              {type.includes('Appreciation') && <ThumbsUp className="h-3 w-3 inline mr-2" />}
                              {type}
                            </SelectItem>
                          ))}
                        </div>
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

          {/* Step 3: Severity & Damage Assessment */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-yellow-400" />
                Severity & Damage Assessment
              </h3>
              
              <div className="bg-slate-800/30 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Severity Level *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SEVERITY_LEVELS.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => updateField('severity', level.value)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        formData.severity === level.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      )}
                    >
                      <span className={cn("font-medium", level.color)}>{level.label}</span>
                      <p className="text-xs text-slate-500 mt-1">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {URGENCY_LEVELS.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => updateField('urgency', level.value)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        formData.urgency === level.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      )}
                    >
                      <span className="font-medium text-white">{level.label}</span>
                      <p className="text-xs text-slate-500 mt-1">{level.description}</p>
                    </button>
                  ))}
                </div>
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

              <Separator className="bg-slate-700" />

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.propertyDamage}
                    onChange={(e) => updateField('propertyDamage', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-slate-300">Was there property damage?</span>
                </label>
              </div>

              {formData.propertyDamage && (
                <div className="space-y-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Damage Description
                    </label>
                    <textarea
                      value={formData.damageDescription}
                      onChange={(e) => updateField('damageDescription', e.target.value)}
                      placeholder="Describe the property damage..."
                      rows={2}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Estimated Damage Value
                    </label>
                    <Input
                      type="number"
                      value={formData.estimatedDamageValue}
                      onChange={(e) => updateField('estimatedDamageValue', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="bg-slate-800/50 border-slate-700 text-white max-w-xs"
                    />
                  </div>
                </div>
              )}

              <Separator className="bg-slate-700" />

              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-cyan-400" />
                Environmental Conditions (Optional)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <CloudRain className="h-4 w-4" />
                    Weather
                  </label>
                  <Select
                    value={formData.weatherConditions}
                    onValueChange={(value) => updateField('weatherConditions', value)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {WEATHER_CONDITIONS.map(condition => (
                        <SelectItem key={condition} value={condition} className="text-white hover:bg-slate-800">
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    {formData.lightingConditions?.includes('Dark') ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    Lighting
                  </label>
                  <Select
                    value={formData.lightingConditions}
                    onValueChange={(value) => updateField('lightingConditions', value)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {LIGHTING_CONDITIONS.map(condition => (
                        <SelectItem key={condition} value={condition} className="text-white hover:bg-slate-800">
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isTrafficRelated && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Road Conditions
                    </label>
                    <Select
                      value={formData.roadConditions}
                      onValueChange={(value) => updateField('roadConditions', value)}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {ROAD_CONDITIONS.map(condition => (
                          <SelectItem key={condition} value={condition} className="text-white hover:bg-slate-800">
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Additional Information */}
          {step === 4 && (
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

          {/* Step 5: Evidence Upload */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-cyan-400" />
                Upload Evidence (Optional)
              </h3>
              
              <p className="text-sm text-slate-400 mb-4">
                Upload photos, videos, or audio recordings related to this incident. 
                Supported formats: JPG, PNG, GIF, MP4, MOV, MP3, WAV (max 50MB per file)
              </p>
              
              <div 
                className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload evidence files"
                />
                <Upload className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500 mt-1">Photos, Videos, or Audio files</p>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-300">Uploaded Files ({uploadedFiles.length})</p>
                  {uploadedFiles.map(file => (
                    <div 
                      key={file.id}
                      className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3"
                    >
                      <div className="p-2 rounded bg-slate-700/50">
                        {file.type === 'image' && <Image className="h-5 w-5 text-green-400" />}
                        {file.type === 'video' && <Video className="h-5 w-5 text-blue-400" />}
                        {file.type === 'audio' && <Mic className="h-5 w-5 text-purple-400" />}
                      </div>
                      {file.preview && (
                        <img src={file.preview} alt="" className="h-10 w-10 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Separator className="bg-slate-700" />
              
              <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
                <p className="font-medium text-slate-300 mb-2">Privacy Notice</p>
                <p>
                  Uploaded files will be securely stored and only shared with relevant authorities 
                  reviewing this report. Files are encrypted during transmission and storage.
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
            
            {step < 5 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="bg-purple-500 hover:bg-purple-600"
                disabled={
                  (step === 1 && !formData.isAnonymous && (!formData.reporterName || !formData.reporterPhone || !formData.reporterEmail)) ||
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
