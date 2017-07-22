defmodule Pirates.GameServer.Factory do
    use Supervisor

    @name __MODULE__

    def start_link do
        Supervisor.start_link(@name, [], name: @name)
    end

    def init([]) do
        children = [        
            worker(Pirates.GameServer.Instance, [], restart: :temporary),
        ]
        supervise(children, strategy: :simple_one_for_one)        
    end
end
