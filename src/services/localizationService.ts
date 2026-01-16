import { supabase } from '@/integrations/supabase/client';

// Types for Arabic dialects
export type ArabicDialect = 'msa' | 'gulf' | 'levantine' | 'egyptian' | 'maghrebi' | 'iraqi' | 'yemeni';

// Types for jurisdictions
export type JurisdictionRegion = 
  | 'sau' | 'uae' | 'egy' | 'jor' | 'kwt' | 'bhr' 
  | 'omn' | 'qat' | 'lbn' | 'mar' | 'dza' | 'tun' 
  | 'irq' | 'yen' | 'global';

export interface ProjectLocalization {
  id: string;
  projectId: string;
  userId: string;
  primaryJurisdiction: JurisdictionRegion;
  secondaryJurisdictions: JurisdictionRegion[];
  inputDialectDetection: boolean;
  preferredOutputDialect: ArabicDialect;
  autoTranslateToMsa: boolean;
  professionalTone: 'formal' | 'semi-formal' | 'informal';
  useLocalGreetings: boolean;
  useHijriDates: boolean;
  currencyFormat: string;
  enableCrossLanguageSearch: boolean;
  autoTranslateQueries: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DialectMapping {
  id: string;
  projectId: string | null;
  userId: string;
  dialect: ArabicDialect;
  dialectTerm: string;
  msaEquivalent: string;
  englishTranslation: string | null;
  context: string | null;
  usageNotes: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JurisdictionTerm {
  id: string;
  jurisdiction: JurisdictionRegion;
  termKey: string;
  localTermAr: string;
  localTermEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  legalReference: string | null;
  effectiveDate: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentDialectAnalysis {
  id: string;
  documentId: string;
  projectId: string;
  userId: string;
  detectedDialects: Array<{
    dialect: string;
    confidence: number;
    sample: string;
  }>;
  primaryDialect: ArabicDialect | null;
  dialectConfidence: number | null;
  hasMixedDialects: boolean;
  dialectRegions: Array<{
    start: number;
    end: number;
    dialect: string;
  }>;
  msaConversionAvailable: boolean;
  msaConvertedText: string | null;
  analyzedAt: string;
}

export interface CulturalToneTemplate {
  id: string;
  name: string;
  jurisdiction: JurisdictionRegion | null;
  toneType: string;
  templateAr: string;
  templateEn: string | null;
  usageContext: string | null;
  formalityLevel: 'formal' | 'semi-formal' | 'informal';
  isDefault: boolean;
  createdAt: string;
}

export interface CrossLanguageQuery {
  id: string;
  projectId: string;
  userId: string;
  sourceQuery: string;
  sourceLanguage: string;
  translatedQuery: string;
  targetLanguage: string;
  resultCount: number;
  avgRelevanceScore: number | null;
  createdAt: string;
  lastUsedAt: string;
  useCount: number;
}

// Dialect display names
export const DIALECT_NAMES: Record<ArabicDialect, { ar: string; en: string }> = {
  msa: { ar: 'العربية الفصحى', en: 'Modern Standard Arabic' },
  gulf: { ar: 'اللهجة الخليجية', en: 'Gulf Arabic' },
  levantine: { ar: 'اللهجة الشامية', en: 'Levantine Arabic' },
  egyptian: { ar: 'اللهجة المصرية', en: 'Egyptian Arabic' },
  maghrebi: { ar: 'اللهجة المغاربية', en: 'Maghrebi Arabic' },
  iraqi: { ar: 'اللهجة العراقية', en: 'Iraqi Arabic' },
  yemeni: { ar: 'اللهجة اليمنية', en: 'Yemeni Arabic' },
};

// Jurisdiction display names
export const JURISDICTION_NAMES: Record<JurisdictionRegion, { ar: string; en: string }> = {
  sau: { ar: 'المملكة العربية السعودية', en: 'Saudi Arabia' },
  uae: { ar: 'الإمارات العربية المتحدة', en: 'United Arab Emirates' },
  egy: { ar: 'مصر', en: 'Egypt' },
  jor: { ar: 'الأردن', en: 'Jordan' },
  kwt: { ar: 'الكويت', en: 'Kuwait' },
  bhr: { ar: 'البحرين', en: 'Bahrain' },
  omn: { ar: 'عُمان', en: 'Oman' },
  qat: { ar: 'قطر', en: 'Qatar' },
  lbn: { ar: 'لبنان', en: 'Lebanon' },
  mar: { ar: 'المغرب', en: 'Morocco' },
  dza: { ar: 'الجزائر', en: 'Algeria' },
  tun: { ar: 'تونس', en: 'Tunisia' },
  irq: { ar: 'العراق', en: 'Iraq' },
  yen: { ar: 'اليمن', en: 'Yemen' },
  global: { ar: 'عالمي', en: 'Global' },
};

class LocalizationService {
  // Project Localization Settings
  async getProjectLocalization(projectId: string): Promise<ProjectLocalization | null> {
    const { data, error } = await supabase
      .from('project_localization')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapProjectLocalization(data);
  }

  async upsertProjectLocalization(
    projectId: string,
    settings: Partial<Omit<ProjectLocalization, 'id' | 'projectId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProjectLocalization> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('project_localization')
      .upsert({
        project_id: projectId,
        user_id: user.id,
        primary_jurisdiction: settings.primaryJurisdiction,
        secondary_jurisdictions: settings.secondaryJurisdictions,
        input_dialect_detection: settings.inputDialectDetection,
        preferred_output_dialect: settings.preferredOutputDialect,
        auto_translate_to_msa: settings.autoTranslateToMsa,
        professional_tone: settings.professionalTone,
        use_local_greetings: settings.useLocalGreetings,
        use_hijri_dates: settings.useHijriDates,
        currency_format: settings.currencyFormat,
        enable_cross_language_search: settings.enableCrossLanguageSearch,
        auto_translate_queries: settings.autoTranslateQueries,
      }, { onConflict: 'project_id' })
      .select()
      .single();

    if (error) throw error;
    return this.mapProjectLocalization(data);
  }

  // Dialect Mappings
  async getDialectMappings(projectId?: string): Promise<DialectMapping[]> {
    let query = supabase
      .from('dialect_mappings')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.mapDialectMapping);
  }

  async createDialectMapping(
    mapping: Omit<DialectMapping, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<DialectMapping> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('dialect_mappings')
      .insert({
        project_id: mapping.projectId,
        user_id: user.id,
        dialect: mapping.dialect,
        dialect_term: mapping.dialectTerm,
        msa_equivalent: mapping.msaEquivalent,
        english_translation: mapping.englishTranslation,
        context: mapping.context,
        usage_notes: mapping.usageNotes,
        is_verified: mapping.isVerified,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDialectMapping(data);
  }

  async deleteDialectMapping(id: string): Promise<void> {
    const { error } = await supabase
      .from('dialect_mappings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Jurisdiction Terms
  async getJurisdictionTerms(jurisdiction?: JurisdictionRegion): Promise<JurisdictionTerm[]> {
    let query = supabase
      .from('jurisdiction_terms')
      .select('*')
      .eq('is_active', true)
      .order('term_key');

    if (jurisdiction) {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.mapJurisdictionTerm);
  }

  // Document Dialect Analysis
  async getDocumentDialectAnalysis(documentId: string): Promise<DocumentDialectAnalysis | null> {
    const { data, error } = await supabase
      .from('document_dialect_analysis')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapDocumentDialectAnalysis(data);
  }

  async createDocumentDialectAnalysis(
    analysis: Omit<DocumentDialectAnalysis, 'id' | 'userId' | 'analyzedAt'>
  ): Promise<DocumentDialectAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('document_dialect_analysis')
      .insert({
        document_id: analysis.documentId,
        project_id: analysis.projectId,
        user_id: user.id,
        detected_dialects: analysis.detectedDialects,
        primary_dialect: analysis.primaryDialect,
        dialect_confidence: analysis.dialectConfidence,
        has_mixed_dialects: analysis.hasMixedDialects,
        dialect_regions: analysis.dialectRegions,
        msa_conversion_available: analysis.msaConversionAvailable,
        msa_converted_text: analysis.msaConvertedText,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDocumentDialectAnalysis(data);
  }

  // Cultural Tone Templates
  async getToneTemplates(options?: {
    jurisdiction?: JurisdictionRegion;
    toneType?: string;
    usageContext?: string;
  }): Promise<CulturalToneTemplate[]> {
    let query = supabase
      .from('cultural_tone_templates')
      .select('*')
      .order('is_default', { ascending: false });

    if (options?.jurisdiction) {
      query = query.or(`jurisdiction.eq.${options.jurisdiction},jurisdiction.is.null`);
    }
    if (options?.toneType) {
      query = query.eq('tone_type', options.toneType);
    }
    if (options?.usageContext) {
      query = query.eq('usage_context', options.usageContext);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.mapCulturalToneTemplate);
  }

  // Cross-Language Query Cache
  async getCrossLanguageQueries(projectId: string, limit = 50): Promise<CrossLanguageQuery[]> {
    const { data, error } = await supabase
      .from('cross_language_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('last_used_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(this.mapCrossLanguageQuery);
  }

  async saveCrossLanguageQuery(query: {
    projectId: string;
    sourceQuery: string;
    sourceLanguage: string;
    translatedQuery: string;
    targetLanguage: string;
    resultCount?: number;
    avgRelevanceScore?: number;
  }): Promise<CrossLanguageQuery> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('cross_language_queries')
      .insert({
        project_id: query.projectId,
        user_id: user.id,
        source_query: query.sourceQuery,
        source_language: query.sourceLanguage,
        translated_query: query.translatedQuery,
        target_language: query.targetLanguage,
        result_count: query.resultCount || 0,
        avg_relevance_score: query.avgRelevanceScore,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapCrossLanguageQuery(data);
  }

  // Helper: Detect language from text
  detectLanguage(text: string): 'ar' | 'en' | 'mixed' {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const arabicMatches = (text.match(arabicPattern) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 'en';
    
    const arabicRatio = arabicMatches / totalChars;
    
    if (arabicRatio > 0.7) return 'ar';
    if (arabicRatio < 0.2) return 'en';
    return 'mixed';
  }

  // Helper: Check if text contains RTL content
  hasRTLContent(text: string): boolean {
    const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
    return rtlPattern.test(text);
  }

  // Mapping functions
  private mapProjectLocalization(data: Record<string, unknown>): ProjectLocalization {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      userId: data.user_id as string,
      primaryJurisdiction: data.primary_jurisdiction as JurisdictionRegion,
      secondaryJurisdictions: (data.secondary_jurisdictions || []) as JurisdictionRegion[],
      inputDialectDetection: data.input_dialect_detection as boolean,
      preferredOutputDialect: data.preferred_output_dialect as ArabicDialect,
      autoTranslateToMsa: data.auto_translate_to_msa as boolean,
      professionalTone: data.professional_tone as 'formal' | 'semi-formal' | 'informal',
      useLocalGreetings: data.use_local_greetings as boolean,
      useHijriDates: data.use_hijri_dates as boolean,
      currencyFormat: data.currency_format as string,
      enableCrossLanguageSearch: data.enable_cross_language_search as boolean,
      autoTranslateQueries: data.auto_translate_queries as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapDialectMapping(data: Record<string, unknown>): DialectMapping {
    return {
      id: data.id as string,
      projectId: data.project_id as string | null,
      userId: data.user_id as string,
      dialect: data.dialect as ArabicDialect,
      dialectTerm: data.dialect_term as string,
      msaEquivalent: data.msa_equivalent as string,
      englishTranslation: data.english_translation as string | null,
      context: data.context as string | null,
      usageNotes: data.usage_notes as string | null,
      isVerified: data.is_verified as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapJurisdictionTerm(data: Record<string, unknown>): JurisdictionTerm {
    return {
      id: data.id as string,
      jurisdiction: data.jurisdiction as JurisdictionRegion,
      termKey: data.term_key as string,
      localTermAr: data.local_term_ar as string,
      localTermEn: data.local_term_en as string,
      descriptionAr: data.description_ar as string | null,
      descriptionEn: data.description_en as string | null,
      legalReference: data.legal_reference as string | null,
      effectiveDate: data.effective_date as string | null,
      isActive: data.is_active as boolean,
      metadata: (data.metadata || {}) as Record<string, unknown>,
      createdAt: data.created_at as string,
    };
  }

  private mapDocumentDialectAnalysis(data: Record<string, unknown>): DocumentDialectAnalysis {
    return {
      id: data.id as string,
      documentId: data.document_id as string,
      projectId: data.project_id as string,
      userId: data.user_id as string,
      detectedDialects: (data.detected_dialects || []) as Array<{
        dialect: string;
        confidence: number;
        sample: string;
      }>,
      primaryDialect: data.primary_dialect as ArabicDialect | null,
      dialectConfidence: data.dialect_confidence as number | null,
      hasMixedDialects: data.has_mixed_dialects as boolean,
      dialectRegions: (data.dialect_regions || []) as Array<{
        start: number;
        end: number;
        dialect: string;
      }>,
      msaConversionAvailable: data.msa_conversion_available as boolean,
      msaConvertedText: data.msa_converted_text as string | null,
      analyzedAt: data.analyzed_at as string,
    };
  }

  private mapCulturalToneTemplate(data: Record<string, unknown>): CulturalToneTemplate {
    return {
      id: data.id as string,
      name: data.name as string,
      jurisdiction: data.jurisdiction as JurisdictionRegion | null,
      toneType: data.tone_type as string,
      templateAr: data.template_ar as string,
      templateEn: data.template_en as string | null,
      usageContext: data.usage_context as string | null,
      formalityLevel: data.formality_level as 'formal' | 'semi-formal' | 'informal',
      isDefault: data.is_default as boolean,
      createdAt: data.created_at as string,
    };
  }

  private mapCrossLanguageQuery(data: Record<string, unknown>): CrossLanguageQuery {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      userId: data.user_id as string,
      sourceQuery: data.source_query as string,
      sourceLanguage: data.source_language as string,
      translatedQuery: data.translated_query as string,
      targetLanguage: data.target_language as string,
      resultCount: data.result_count as number,
      avgRelevanceScore: data.avg_relevance_score as number | null,
      createdAt: data.created_at as string,
      lastUsedAt: data.last_used_at as string,
      useCount: data.use_count as number,
    };
  }
}

export const localizationService = new LocalizationService();
