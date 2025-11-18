import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { PackingListResponse } from './models/packing-list.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [], // No separate CSS file, using Tailwind via HTML
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class AppComponent {
  private fb = inject(FormBuilder);
  private geminiService = inject(GeminiService);

  tripForm: FormGroup;
  uploadedFiles: WritableSignal<File[]> = signal([]);
  
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  packingListResult = signal<PackingListResponse | null>(null);
  
  activeTab = signal<'savjeti' | 'odjevneKombinacije' | 'popis' | 'kupovina'>('popis');

  filePreviews = computed(() => {
    return this.uploadedFiles().map(file => ({
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type.startsWith('image/') ? 'image' : 'other',
        url: URL.createObjectURL(file)
    }));
  });

  constructor() {
    this.tripForm = this.fb.group({
      destination: ['Dubrovnik', Validators.required],
      startDate: ['2025-11-19', Validators.required],
      endDate: ['2025-11-22', Validators.required],
      passengers: this.fb.group({
        men: [1, [Validators.required, Validators.min(0)]],
        women: [1, [Validators.required, Validators.min(0)]],
        children: [0, [Validators.required, Validators.min(0)]],
      }),
      activities: this.fb.array([
        this.createActivity('Kongresni sastanci', 'Dan'),
        this.createActivity('Svečana gala večera', 'Noć'),
        this.createActivity('Slobodno vrijeme/Kava na Stradunu', 'Ležerno')
      ]),
      advancedOptions: this.fb.group({
        formalityLevel: ['Poslovno/Formalno'],
        carryOnPriority: [true],
        localWeatherForecast: ['Hladno (12-15°C) i Kišovito. Obavezna vodootporna odjeća.'],
      }),
    });
  }

  get activities(): FormArray {
    return this.tripForm.get('activities') as FormArray;
  }

  createActivity(description: string, time: string): FormGroup {
    return this.fb.group({
      description: [description, Validators.required],
      time: [time, Validators.required]
    });
  }

  addActivity() {
    this.activities.push(this.createActivity('', ''));
  }

  removeActivity(index: number) {
    this.activities.removeAt(index);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      this.uploadedFiles.update(currentFiles => [...currentFiles, ...newFiles]);
    }
  }

  removeFile(index: number) {
    this.uploadedFiles.update(currentFiles => {
      const updatedFiles = [...currentFiles];
      const removedFile = updatedFiles.splice(index, 1)[0];
      // Revoke the object URL to free up memory
      const preview = this.filePreviews().find(p => p.name === removedFile.name);
      if (preview) {
        URL.revokeObjectURL(preview.url);
      }
      return updatedFiles;
    });
  }
  
  formatFileSize(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async generateList() {
    if (this.tripForm.invalid) {
      this.error.set('Molimo ispunite sva obavezna polja.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.packingListResult.set(null);

    try {
      const tripDetails = this.tripForm.value;
      const result = await this.geminiService.generatePackingList(tripDetails, this.uploadedFiles());
      this.packingListResult.set(result);
    } catch (e: any) {
      this.error.set(e.message || 'Došlo je do nepoznate pogreške.');
    } finally {
      this.loading.set(false);
    }
  }

  setActiveTab(tab: 'savjeti' | 'odjevneKombinacije' | 'popis' | 'kupovina') {
    this.activeTab.set(tab);
  }
}
