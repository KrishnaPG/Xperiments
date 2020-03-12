#include "simstring/include/simstring/simstring.h"

typedef simstring::ngram_generator NGramGenerator;
typedef simstring::writer_base<std::string> Writer;
typedef simstring::reader Reader;

#include <napi.h>

class WriterWrapper: public Napi::ObjectWrap<WriterWrapper> {
	public:
	WriterWrapper(const Napi::CallbackInfo& info) : Napi::ObjectWrap<WriterWrapper>(info)
	{
    m_pNGramGen = new simstring::ngram_generator(3, false);
		std::string filePath = info[0].ToString().Utf8Value();
		m_pWriter = new simstring::writer_base<std::string>(*m_pNGramGen, filePath);
	}
	~WriterWrapper()
	{ 
		printf("\n~WriterWrapper");
		delete m_pWriter;
		delete m_pNGramGen;		
	}
	static void Initialize(Napi::Env env, Napi::Object exports) 
	{
		Napi::HandleScope scope(env);
		exports.Set("Writer", DefineClass(env, "Writer", {
			InstanceMethod("insert", &WriterWrapper::insert, napi_enumerable),
			InstanceMethod("close", &WriterWrapper::close, napi_enumerable)
		}));
	}
	Napi::Value insert(const Napi::CallbackInfo& info)
	{
		std::string str = info[0].ToString().Utf8Value();
		printf("\ninserting: %s", str.c_str());
		return Napi::Boolean::New(info.Env(), this->m_pWriter->insert(str));
	}
	Napi::Value close(const Napi::CallbackInfo& info)
	{
		this->m_pWriter->close(); printf("\nwriter closed:");
		return Napi::Value();
	}	
	private:
	simstring::ngram_generator* m_pNGramGen;
	simstring::writer_base<std::string>* m_pWriter;
};

class ReaderWrapper : public Napi::ObjectWrap<ReaderWrapper> {
	public:
	ReaderWrapper(const Napi::CallbackInfo& info) : Napi::ObjectWrap<ReaderWrapper>(info)
	{
		m_pReader = new simstring::reader();
	}
	~ReaderWrapper() { printf("\n~ReaderWrapper");
		delete m_pReader;
		m_pReader = NULL;
	}
	static void Initialize(Napi::Env env, Napi::Object exports) 
	{
		Napi::HandleScope scope(env);
		exports.Set("Reader", DefineClass(env, "Reader", {
			InstanceMethod("open", &ReaderWrapper::open, napi_enumerable),
			InstanceMethod("close", &ReaderWrapper::close, napi_enumerable),
			InstanceMethod("retrieve", &ReaderWrapper::retrieve, napi_enumerable),
		}));
	}
	Napi::Value open(const Napi::CallbackInfo& info)
	{
		std::string str = info[0].ToString().Utf8Value();
		return Napi::Boolean::New(info.Env(), this->m_pReader->open(str));
	}
	Napi::Value close(const Napi::CallbackInfo& info)
	{
		this->m_pReader->close();
		return Napi::Value();
	}
	Napi::Value retrieve(const Napi::CallbackInfo& info)
	{
		std::string query = info[0].ToString().Utf8Value();
		int measureType = info[1].As<Napi::Number>().Uint32Value();
		double threshold = info[2].As<Napi::Number>().DoubleValue();

		std::vector<std::string> xstrs;
		m_pReader->retrieve(query, measureType, threshold, std::back_inserter(xstrs));

		auto env = info.Env();
		Napi::Array results = Napi::Array::New(env, xstrs.size());
		for(int i=0, nMax = xstrs.size(); i < nMax; ++i)
			results[i] = Napi::String::New(env, xstrs[i]);

		return results;
	}
	private:
	simstring::reader* m_pReader;
};

Napi::Value Add(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (info.Length() < 2) {
		Napi::TypeError::New(env, "Wrong number of arguments")
				.ThrowAsJavaScriptException();
		return env.Null();
	}

	if (!info[0].IsNumber() || !info[1].IsNumber()) {
		Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
		return env.Null();
	}

	double arg0 = info[0].As<Napi::Number>().DoubleValue();
	double arg1 = info[1].As<Napi::Number>().DoubleValue();
	Napi::Number num = Napi::Number::New(env, arg0 + arg1);

	return num;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "add"), Napi::Function::New(env, Add));
	ReaderWrapper::Initialize(env, exports);
	WriterWrapper::Initialize(env, exports);
	return exports;
}

NODE_API_MODULE(addon, Init)
