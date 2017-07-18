defmodule Pirates.GameServer.Factory do
    use Supervisor

    @name __MODULE__

    def start_link do
        Supervisor.start_link([worker(Pirates.GameServer.Instance, [:named], restart: :transient)], name: @name, strategy: :simple_one_for_one)
    end

    def init([]) do
        children = [        
            worker(Pirates.GameServer.Instance, [:named], restart: :transient),
        ]

        supervise(children, strategy: :simple_one_for_one)        
    end
end